// Branded types for better type safety
export type JobDescription = string & { readonly __brand: "JobDescription" };
export type CandidateScore = number & { readonly __brand: "CandidateScore" };
export type CandidateId = string & { readonly __brand: "CandidateId" };

// Domain entities
export interface Education {
  readonly institution: string;
  readonly degree: string;
  readonly field: string;
  readonly startYear: number;
  readonly endYear?: number;
  readonly gpa?: number;
}

export interface WorkExperience {
  readonly company: string;
  readonly position: string;
  readonly startDate: string;
  readonly endDate?: string;
  readonly description: string;
  readonly skills: ReadonlyArray<string>;
}

export interface QuestionAnswer {
  readonly question: string;
  readonly answer: string;
}

export interface Candidate {
  readonly id: CandidateId;
  readonly name: string;
  readonly email: string;
  readonly experience: number;
  readonly location: string;
  readonly bio: string;
  readonly jobTitle?: string;
  readonly jobDepartment?: string;
  readonly jobLocation?: string;
  readonly headline?: string;
  readonly creationTime?: string;
  readonly stage?: string;
  readonly tags?: string;
  readonly source?: string;
  readonly type?: string;
  readonly summary?: string;
  readonly keywords?: string;
  readonly educations?: string;
  readonly experiences?: string;
  readonly skills?: ReadonlyArray<string>;
  readonly education?: ReadonlyArray<string>;
  readonly workHistory?: ReadonlyArray<string>;
  readonly disqualified?: boolean;
  readonly disqualifiedAt?: string;
  readonly disqualificationCategory?: string;
  readonly disqualificationReason?: string;
  readonly disqualificationNote?: string;
  readonly questions?: ReadonlyArray<QuestionAnswer>;
  readonly availability?: "immediate" | "2-weeks" | "1-month" | "not-available";
}

export interface ScoredCandidate extends Candidate {
  readonly score: CandidateScore;
  readonly highlights: ReadonlyArray<string>;
  readonly reasoning: string;
  readonly matchedSkills: ReadonlyArray<string>;
  readonly scoringTimestamp: Date;
}

// Scoring configuration
export interface ScoringWeights {
  readonly skillsMatch: number;
  readonly experienceLevel: number;
  readonly education: number;
  readonly portfolio: number;
  readonly availability: number;
}

// Error types with discriminated unions
export type ScoringError =
  | {
      readonly type: "RATE_LIMIT";
      readonly retryAfter: number;
      readonly message: string;
    }
  | {
      readonly type: "PARSE_ERROR";
      readonly details: string;
      readonly rawResponse?: string;
    }
  | {
      readonly type: "NETWORK_ERROR";
      readonly message: string;
      readonly code?: string;
    }
  | {
      readonly type: "VALIDATION_ERROR";
      readonly field: string;
      readonly message: string;
    }
  | {
      readonly type: "QUOTA_EXCEEDED";
      readonly resetTime: Date;
      readonly message: string;
    }
  | { readonly type: "UNKNOWN_ERROR"; readonly message: string };

// Result types for functional error handling
export type Result<T, E = ScoringError> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export type ScoringResult = Result<ReadonlyArray<ScoredCandidate>>;

// API request/response types
export interface ScoreRequest {
  readonly jobDescription: JobDescription;
  readonly maxResults?: number;
  readonly weights?: Partial<ScoringWeights>;
}

export interface ScoreResponse {
  readonly candidates: ReadonlyArray<ScoredCandidate>;
  readonly totalProcessed: number;
  readonly processingTime: number;
  readonly modelUsed: string;
}

// LLM-specific types
export interface LLMProvider {
  readonly name: "openai" | "anthropic" | "local";
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
}

export interface PromptTemplate {
  readonly system: string;
  readonly fewShotExamples: ReadonlyArray<{
    readonly input: string;
    readonly output: string;
  }>;
  readonly userTemplate: string;
}

// Utility types
export type NonEmptyArray<T> = [T, ...T[]];

// Type guards
export function isSuccess<T, E>(
  result: Result<T, E>
): result is { success: true; data: T } {
  return result.success;
}

export function isError<T, E>(
  result: Result<T, E>
): result is { success: false; error: E } {
  return !result.success;
}

export function isScoringError(error: unknown): error is ScoringError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    typeof error.type === "string"
  );
}

// Factory functions for branded types
export function createJobDescription(description: string): JobDescription {
  return description as JobDescription;
}

export function createCandidateScore(score: number): CandidateScore {
  if (score < 0 || score > 100) {
    throw new Error("Score must be between 0 and 100");
  }
  return score as CandidateScore;
}

export function createCandidateId(id: string): CandidateId {
  return id as CandidateId;
}
