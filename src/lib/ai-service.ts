import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText } from "ai";
import type {
  Candidate,
  JobDescription,
  ScoringResult,
  ScoredCandidate,
  ScoringError,
  ScoringWeights,
  LLMProvider
} from "./types";
import { createCandidateScore } from "./types";
import { AIScoreResponseSchema } from "./schemas";
import {
  createScoringPrompt,
  createConstrainedPrompt,
  validatePromptResponse
} from "./prompts";

const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  batchSize: 10,
  timeout: 30000,
  maxConcurrentBatches: 3
} as const;

function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "openai";
  const model = process.env.LLM_MODEL || "gpt-4.1-mini";

  return {
    name: provider as "openai" | "anthropic",
    model,
    maxTokens: 4000,
    temperature: 0.3
  };
}

function getAIModel(provider: LLMProvider) {
  switch (provider.name) {
    case "openai":
      return openai(provider.model);
    case "anthropic":
      return anthropic(provider.model);
    default:
      throw new Error(`Unsupported LLM provider: ${provider.name}`);
  }
}

function calculateDelay(attempt: number): number {
  const delay = DEFAULT_CONFIG.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, DEFAULT_CONFIG.maxDelay);
}

interface APIError {
  status?: number;
  retryAfter?: number;
  message?: string;
  code?: string;
  name?: string;
  issues?: unknown[];
  rawResponse?: string;
}

function isAPIError(error: unknown): error is APIError {
  return typeof error === "object" && error !== null;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = DEFAULT_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (isAPIError(error) && error.status === 429) {
        if (attempt < maxRetries) {
          const delay = calculateDelay(attempt);
          console.warn(
            `Rate limited. Retrying in ${delay}ms... (attempt ${
              attempt + 1
            }/${maxRetries + 1})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt);
        console.warn(
          `Request failed. Retrying in ${delay}ms... (attempt ${attempt + 1}/${
            maxRetries + 1
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

function mapErrorToScoringError(error: unknown): ScoringError {
  if (!isAPIError(error)) {
    return {
      type: "UNKNOWN_ERROR",
      message: String(error || "Unknown error occurred")
    };
  }

  if (error.status === 429) {
    return {
      type: "RATE_LIMIT",
      retryAfter: error.retryAfter || 60,
      message: "API rate limit exceeded"
    };
  }

  if (error.status === 402 || error.code === "insufficient_quota") {
    return {
      type: "QUOTA_EXCEEDED",
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      message: "API quota exceeded"
    };
  }

  if (
    error.code === "ECONNREFUSED" ||
    error.code === "ENOTFOUND" ||
    error.code === "TIMEOUT"
  ) {
    return {
      type: "NETWORK_ERROR",
      message: `Network error: ${error.message}`,
      code: error.code
    };
  }

  if (error.name === "ZodError" || error.issues) {
    return {
      type: "VALIDATION_ERROR",
      field: "response",
      message: "Invalid response format from AI model"
    };
  }

  if (error.name === "SyntaxError" && error.message?.includes("JSON")) {
    const parseError: ScoringError = {
      type: "PARSE_ERROR",
      details: error.message
    };
    
    if (error.rawResponse) {
      return {
        ...parseError,
        rawResponse: error.rawResponse
      };
    }
    
    return parseError;
  }

  return {
    type: "UNKNOWN_ERROR",
    message: error.message || "Unknown error occurred"
  };
}

type BatchResult =
  | {
      readonly success: true;
      readonly data: ReadonlyArray<ScoredCandidate>;
    }
  | {
      readonly success: false;
      readonly error: ScoringError;
      readonly batchIndex: number;
    };

type ScoringStrategy = "structured" | "fallback";

const createBatches = <T>(
  items: ReadonlyArray<T>,
  batchSize: number
): ReadonlyArray<ReadonlyArray<T>> =>
  Array.from({ length: Math.ceil(items.length / batchSize) }, (_, i) =>
    items.slice(i * batchSize, (i + 1) * batchSize)
  );

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface AICandidateResponse {
  id: string;
  score: number;
  highlights: string[];
  reasoning: string;
  matchedSkills: string[];
}

const createScoredCandidate = (
  candidate: AICandidateResponse,
  originalCandidates: ReadonlyArray<Candidate>
): ScoredCandidate => {
  const originalCandidate = originalCandidates.find(
    (c) => c.id === candidate.id
  );
  if (!originalCandidate) {
    throw new Error(`Candidate with ID ${candidate.id} not found`);
  }

  return {
    ...originalCandidate,
    score: createCandidateScore(candidate.score),
    highlights: candidate.highlights || [],
    reasoning: candidate.reasoning || "No reasoning provided",
    matchedSkills: candidate.matchedSkills || [],
    scoringTimestamp: new Date()
  };
};

async function scoreBatchWithStrategy(
  jobDescription: JobDescription,
  candidates: ReadonlyArray<Candidate>,
  strategy: ScoringStrategy,
  weights?: Partial<ScoringWeights>
): Promise<ScoringResult> {
  const provider = getLLMProvider();
  const model = getAIModel(provider);

  try {
    if (strategy === "structured") {
      const prompt = createScoringPrompt(jobDescription, candidates, weights);

      const { object } = await retryWithBackoff(async () => {
        return await generateObject({
          model,
          schema: AIScoreResponseSchema,
          prompt,
          temperature: provider.temperature,
          maxTokens: provider.maxTokens
        });
      });

      const scoredCandidates = object.candidates.map((candidate) =>
        createScoredCandidate(candidate, candidates)
      );

      return {
        success: true,
        data: scoredCandidates
      };
    } else {
      const prompt = createConstrainedPrompt(jobDescription, candidates);

      const { text } = await retryWithBackoff(async () => {
        return await generateText({
          model,
          prompt,
          temperature: provider.temperature,
          maxTokens: provider.maxTokens
        });
      });

      const validation = validatePromptResponse(text);

      if (!validation.isValid) {
        return {
          success: false,
          error: {
            type: "PARSE_ERROR",
            details: validation.error || "Failed to parse AI response",
            rawResponse: text
          }
        };
      }

      const scoredCandidates = validation.parsed!.candidates.map((candidate) =>
        createScoredCandidate(candidate, candidates)
      );

      return {
        success: true,
        data: scoredCandidates
      };
    }
  } catch (error) {
    return {
      success: false,
      error: mapErrorToScoringError(error)
    };
  }
}

const processBatch = async (
  batch: ReadonlyArray<Candidate>,
  batchIndex: number,
  jobDescription: JobDescription,
  weights?: Partial<ScoringWeights>
): Promise<BatchResult> => {
  console.log(
    `Processing batch ${batchIndex + 1} (${batch.length} candidates)`
  );

  let result = await scoreBatchWithStrategy(
    jobDescription,
    batch,
    "structured",
    weights
  );

  if (!result.success && result.error.type === "PARSE_ERROR") {
    console.warn(
      `Batch ${batchIndex + 1}: Structured generation failed, trying fallback`
    );
    result = await scoreBatchWithStrategy(
      jobDescription,
      batch,
      "fallback",
      weights
    );
  }

  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  } else {
    return {
      success: false,
      error: result.error,
      batchIndex
    };
  }
};

const processParallelBatches = async (
  batches: ReadonlyArray<ReadonlyArray<Candidate>>,
  jobDescription: JobDescription,
  weights?: Partial<ScoringWeights>
): Promise<{
  scoredCandidates: ReadonlyArray<ScoredCandidate>;
  errors: ReadonlyArray<ScoringError>;
}> => {
  const { maxConcurrentBatches } = DEFAULT_CONFIG;
  const results: BatchResult[] = [];

  for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
    const batchGroup = batches.slice(i, i + maxConcurrentBatches);

    const batchPromises = batchGroup.map((batch, groupIndex) =>
      processBatch(batch, i + groupIndex, jobDescription, weights)
    );

    const groupResults = await Promise.allSettled(batchPromises);

    const processedResults = groupResults.map((result, groupIndex) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          success: false,
          error: mapErrorToScoringError(result.reason),
          batchIndex: i + groupIndex
        } as const;
      }
    });

    results.push(...processedResults);

    if (i + maxConcurrentBatches < batches.length) {
      await delay(1000);
    }
  }

  const scoredCandidates = results
    .filter(
      (result): result is Extract<BatchResult, { success: true }> =>
        result.success
    )
    .flatMap((result) => result.data);

  const errors = results
    .filter(
      (result): result is Extract<BatchResult, { success: false }> =>
        !result.success
    )
    .map((result) => result.error);

  return { scoredCandidates, errors };
};

const sortAndLimitCandidates = (
  candidates: ReadonlyArray<ScoredCandidate>,
  maxResults: number
): ReadonlyArray<ScoredCandidate> =>
  candidates
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

export async function scoreCandidates(
  jobDescription: JobDescription,
  candidates: ReadonlyArray<Candidate>,
  options: {
    weights?: Partial<ScoringWeights>;
    batchSize?: number;
    maxResults?: number;
  } = {}
): Promise<ScoringResult> {
  const {
    weights,
    batchSize = DEFAULT_CONFIG.batchSize,
    maxResults = 30
  } = options;

  if (candidates.length === 0) {
    return {
      success: true,
      data: []
    };
  }

  try {
    const startTime = Date.now();
    const batches = createBatches(candidates, batchSize);

    console.log(
      `Processing ${candidates.length} candidates in ${batches.length} batches with up to ${DEFAULT_CONFIG.maxConcurrentBatches} concurrent batches`
    );

    const { scoredCandidates, errors } = await processParallelBatches(
      batches,
      jobDescription,
      weights
    );

    if (scoredCandidates.length === 0) {
      return {
        success: false,
        error: errors[0] || {
          type: "UNKNOWN_ERROR",
          message: "No candidates could be scored"
        }
      };
    }

    const sortedCandidates = sortAndLimitCandidates(
      scoredCandidates,
      maxResults
    );
    const processingTime = Date.now() - startTime;

    console.log(
      `Successfully scored ${scoredCandidates.length} candidates in ${processingTime}ms, returning top ${sortedCandidates.length}`
    );

    if (errors.length > 0) {
      console.warn(`${errors.length} batches failed during processing`);
    }

    return {
      success: true,
      data: sortedCandidates
    };
  } catch (error) {
    console.error("Unexpected error in scoreCandidates:", error);
    return {
      success: false,
      error: mapErrorToScoringError(error)
    };
  }
}

export async function checkAIHealth(): Promise<{
  healthy: boolean;
  provider: string;
  model: string;
  error?: string;
}> {
  try {
    const provider = getLLMProvider();
    const model = getAIModel(provider);

    await generateText({
      model,
      prompt: "Respond with 'OK'",
      maxTokens: 10
    });

    return {
      healthy: true,
      provider: provider.name,
      model: provider.model
    };
  } catch (error) {
    return {
      healthy: false,
      provider: "unknown",
      model: "unknown",
      error: String(error)
    };
  }
}
