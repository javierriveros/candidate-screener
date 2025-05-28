import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scoreCandidates } from "@/lib/ai-service";
import { getCandidates } from "@/lib/data-processor";
import { createJobDescription } from "@/lib/types";
import type { ScoreResponse, ScoringError } from "@/lib/types";

const ScoreRequestBodySchema = z.object({
  jobDescription: z
    .string()
    .min(10, "Job description must be at least 10 characters")
    .max(200, "Job description must not exceed 200 characters"),
  maxResults: z.number().int().min(1).max(100).optional().default(30),
  weights: z
    .object({
      skillsMatch: z.number().min(0).max(1).optional(),
      experienceLevel: z.number().min(0).max(1).optional(),
      education: z.number().min(0).max(1).optional(),
      portfolio: z.number().min(0).max(1).optional(),
      availability: z.number().min(0).max(1).optional()
    })
    .optional()
});

type ScoreRequestBody = z.infer<typeof ScoreRequestBodySchema>;

function createErrorResponse(
  error: ScoringError | string,
  status: number = 500
): NextResponse {
  if (typeof error === "string") {
    return NextResponse.json(
      {
        error: {
          type: "UNKNOWN_ERROR",
          message: error
        }
      },
      { status }
    );
  }

  const statusMap: Record<ScoringError["type"], number> = {
    VALIDATION_ERROR: 400,
    RATE_LIMIT: 429,
    PARSE_ERROR: 502,
    NETWORK_ERROR: 503,
    QUOTA_EXCEEDED: 402,
    UNKNOWN_ERROR: 500
  };

  const responseStatus = statusMap[error.type] || 500;

  return NextResponse.json(
    { error },
    {
      status: responseStatus,
      headers:
        error.type === "RATE_LIMIT"
          ? {
              "Retry-After": error.retryAfter.toString()
            }
          : {}
    }
  );
}

interface RequestValidationResult {
  success: true;
  data: ScoreRequestBody;
}

interface RequestValidationError {
  success: false;
  error: string;
}

type ValidationResult = RequestValidationResult | RequestValidationError;

function validateRequestBody(body: unknown): ValidationResult {
  try {
    const data = ScoreRequestBodySchema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `${firstError?.path.join(".") || "field"}: ${
          firstError?.message || "Invalid value"
        }`
      };
    }
    return {
      success: false,
      error: "Invalid request body"
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON in request body", 400);
    }

    const validation = validateRequestBody(body);
    if (!validation.success) {
      return createErrorResponse(
        {
          type: "VALIDATION_ERROR",
          field: "body",
          message: validation.error
        },
        400
      );
    }

    const { jobDescription, maxResults, weights } = validation.data;

    let typedJobDescription;
    try {
      typedJobDescription = createJobDescription(jobDescription);
    } catch (error) {
      return createErrorResponse(
        {
          type: "VALIDATION_ERROR",
          field: "jobDescription",
          message:
            error instanceof Error ? error.message : "Invalid job description"
        },
        400
      );
    }

    let candidates;
    try {
      candidates = await getCandidates();
    } catch (error) {
      console.error("Failed to load candidates:", error);
      return createErrorResponse("Failed to load candidate database", 500);
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        candidates: [],
        totalProcessed: 0,
        processingTime: Date.now() - startTime,
        modelUsed: process.env.LLM_MODEL || "unknown"
      } satisfies ScoreResponse);
    }

    const scoringOptions: {
      maxResults: number;
      weights?: {
        skillsMatch: number;
        experienceLevel: number;
        education: number;
        portfolio: number;
        availability: number;
      };
    } = { maxResults };

    if (weights) {
      const fullWeights = {
        skillsMatch: weights.skillsMatch ?? 0.4,
        experienceLevel: weights.experienceLevel ?? 0.25,
        education: weights.education ?? 0.15,
        portfolio: weights.portfolio ?? 0.1,
        availability: weights.availability ?? 0.1
      };
      scoringOptions.weights = fullWeights;
    }

    const result = await scoreCandidates(
      typedJobDescription,
      candidates,
      scoringOptions
    );

    if (!result.success) {
      return createErrorResponse(result.error);
    }

    const processingTime = Date.now() - startTime;
    const response: ScoreResponse = {
      candidates: result.data,
      totalProcessed: candidates.length,
      processingTime,
      modelUsed: process.env.LLM_MODEL || "unknown"
    };

    console.log(
      `Successfully scored ${candidates.length} candidates in ${processingTime}ms, returning top ${result.data.length}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in score API:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const candidates = await getCandidates();

    return NextResponse.json({
      status: "healthy",
      candidatesCount: candidates.length,
      provider: process.env.LLM_PROVIDER || "openai",
      model: process.env.LLM_MODEL || "gpt-4.1-mini",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
