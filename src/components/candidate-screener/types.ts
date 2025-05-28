import type { ScoredCandidate } from "@/lib/types";

export interface FormState {
  jobDescription: string;
  isLoading: boolean;
  error: string | null;
  results: readonly ScoredCandidate[] | null;
  processingTime?: number;
  totalProcessed?: number;
}

export interface JobDescriptionFormProps {
  jobDescription: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (jobDescription: string) => void;
  onJobDescriptionChange: (value: string) => void;
}

export interface CandidateListProps {
  candidates: readonly ScoredCandidate[];
  totalProcessed?: number | undefined;
  processingTime?: number | undefined;
}

export interface CandidateCardProps {
  candidate: ScoredCandidate;
  index: number;
}

export interface LoadingStateProps {
  title?: string;
  description?: string;
  itemCount?: number;
}

export interface EmptyStateProps {
  title: string;
  description: string;
} 