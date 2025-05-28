import { z } from "zod";
import type {
  JobDescription,
  CandidateId,
  CandidateScore,
  LLMProvider
} from "./types";

export const JobDescriptionSchema = z
  .string()
  .min(10, "Job description must be at least 10 characters")
  .max(200, "Job description must not exceed 200 characters")
  .transform((val) => val as JobDescription);

export const CandidateIdSchema = z
  .string()
  .uuid("Candidate ID must be a valid UUID")
  .transform((val) => val as CandidateId);

export const CandidateScoreSchema = z
  .number()
  .min(0, "Score must be at least 0")
  .max(100, "Score must not exceed 100")
  .transform((val) => val as CandidateScore);

export const EducationSchema = z
  .object({
    institution: z.string().min(1, "Institution name is required"),
    degree: z.string().min(1, "Degree is required"),
    field: z.string().min(1, "Field of study is required"),
    startYear: z.number().int().min(1950).max(new Date().getFullYear()),
    endYear: z
      .number()
      .int()
      .min(1950)
      .max(new Date().getFullYear() + 10)
      .optional(),
    gpa: z.number().min(0).max(4.0).optional()
  })
  .refine(
    (data) => {
      if (data.endYear && data.startYear) {
        return data.endYear >= data.startYear;
      }
      return true;
    },
    {
      message: "End year must be after start year",
      path: ["endYear"]
    }
  );

export const WorkExperienceSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  position: z.string().min(1, "Position is required"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Start date must be in YYYY-MM format"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "End date must be in YYYY-MM format")
    .optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  skills: z.array(z.string().min(1)).readonly()
});

export const QuestionAnswerSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required")
});

export const CandidateSchema = z.object({
  id: CandidateIdSchema,
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Valid email is required"),
  experience: z
    .number()
    .int()
    .min(0, "Experience cannot be negative")
    .max(50, "Experience seems too high"),
  location: z.string().min(1, "Location is required"),
  bio: z
    .string()
    .min(20, "Bio must be at least 20 characters")
    .max(2000, "Bio too long"),
  jobTitle: z.string().optional(),
  jobDepartment: z.string().optional(),
  jobLocation: z.string().optional(),
  headline: z.string().optional(),
  creationTime: z.string().optional(),
  stage: z.string().optional(),
  tags: z.string().optional(),
  source: z.string().optional(),
  type: z.string().optional(),
  summary: z.string().optional(),
  keywords: z.string().optional(),
  educations: z.string().optional(),
  experiences: z.string().optional(),
  skills: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  workHistory: z.array(z.string()).optional(),
  disqualified: z.boolean().optional(),
  disqualifiedAt: z.string().optional(),
  disqualificationCategory: z.string().optional(),
  disqualificationReason: z.string().optional(),
  disqualificationNote: z.string().optional(),
  questions: z.array(QuestionAnswerSchema).optional(),
  availability: z
    .enum(["immediate", "2-weeks", "1-month", "not-available"])
    .optional()
});

export const ScoredCandidateSchema = CandidateSchema.extend({
  score: CandidateScoreSchema,
  highlights: z.array(z.string().min(1)).min(1).readonly(),
  reasoning: z.string().min(10, "Reasoning must be at least 10 characters"),
  matchedSkills: z.array(z.string().min(1)).readonly(),
  scoringTimestamp: z.date()
});

const BaseScoringWeightsSchema = z.object({
  skillsMatch: z.number().min(0).max(1),
  experienceLevel: z.number().min(0).max(1),
  education: z.number().min(0).max(1),
  portfolio: z.number().min(0).max(1),
  availability: z.number().min(0).max(1)
});

export const ScoringWeightsSchema = BaseScoringWeightsSchema.refine(
  (weights) => {
    const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
    return Math.abs(sum - 1) < 0.001;
  },
  {
    message: "Weights must sum to 1"
  }
);

export const ScoreRequestSchema = z.object({
  jobDescription: JobDescriptionSchema,
  maxResults: z.number().int().min(1).max(100).default(30),
  weights: BaseScoringWeightsSchema.partial().optional()
});

export const LLMProviderSchema = z.object({
  name: z.enum(["openai", "anthropic", "local"]),
  model: z.string().min(1),
  maxTokens: z.number().int().min(1).max(32000),
  temperature: z.number().min(0).max(2)
}) satisfies z.ZodType<LLMProvider>;

export const AIScoreResponseSchema = z.object({
  candidates: z.array(
    z.object({
      id: z.string(),
      score: z.number().min(0).max(100),
      highlights: z.array(z.string().min(1)),
      reasoning: z.string().min(10),
      matchedSkills: z.array(z.string())
    })
  )
});

export const JobDescriptionFormSchema = z.object({
  jobDescription: z
    .string()
    .min(10, "Please provide a more detailed job description")
    .max(200, "Job description is too long (max 200 characters)")
    .transform((val) => val.trim())
});

export const CandidateBatchSchema = z.object({
  candidates: z.array(CandidateSchema).min(1).max(10),
  jobDescription: JobDescriptionSchema,
  batchId: z.string().uuid()
});

export const APIErrorSchema = z.object({
  type: z.enum([
    "VALIDATION_ERROR",
    "RATE_LIMIT",
    "PARSE_ERROR",
    "NETWORK_ERROR",
    "QUOTA_EXCEEDED",
    "UNKNOWN_ERROR"
  ]),
  message: z.string(),
  details: z.record(z.string()).optional(),
  retryAfter: z.number().optional()
});

export const ConfigSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  LLM_MODEL: z.string().default("gpt-4.1-mini"),
  CACHE_TTL: z.coerce.number().int().min(0).default(3600),
  MAX_CANDIDATES_PER_BATCH: z.coerce.number().int().min(1).max(20).default(10),
  DEFAULT_MAX_RESULTS: z.coerce.number().int().min(1).max(100).default(30)
});

export type JobDescriptionForm = z.infer<typeof JobDescriptionFormSchema>;
export type AIScoreResponse = z.infer<typeof AIScoreResponseSchema>;
export type APIError = z.infer<typeof APIErrorSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export function validateCandidate(
  data: unknown
): z.infer<typeof CandidateSchema> {
  return CandidateSchema.parse(data);
}

export function validateJobDescription(data: unknown): JobDescription {
  return JobDescriptionSchema.parse(data);
}

export function validateScoreRequest(
  data: unknown
): z.infer<typeof ScoreRequestSchema> {
  return ScoreRequestSchema.parse(data);
}

export function validateConfig(
  env: Record<string, string | undefined>
): Config {
  return ConfigSchema.parse(env);
}
