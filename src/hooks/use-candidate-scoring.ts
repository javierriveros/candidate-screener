import { useState } from "react";
import type { ScoreResponse } from "@/lib/types";
import type { FormState } from "@/components/candidate-screener/types";

const MIN_JOB_DESCRIPTION_LENGTH = 10;

export function useCandidateScoring() {
  const [state, setState] = useState<FormState>({
    jobDescription: "",
    isLoading: false,
    error: null,
    results: null
  });

  const validateJobDescription = (description: string): string | null => {
    if (description.trim().length < MIN_JOB_DESCRIPTION_LENGTH) {
      return `Job description must be at least ${MIN_JOB_DESCRIPTION_LENGTH} characters long`;
    }
    return null;
  };

  const scoreCandidate = async (jobDescription: string) => {
    const validationError = validateJobDescription(jobDescription);
    if (validationError) {
      setState((prev) => ({ ...prev, error: validationError }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      results: null
    }));

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          maxResults: 30
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.error?.message || "Failed to score candidates";
        throw new Error(errorMessage);
      }

      const data: ScoreResponse = await response.json();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        results: data.candidates,
        processingTime: data.processingTime,
        totalProcessed: data.totalProcessed
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
      }));
    }
  };

  const updateJobDescription = (description: string) => {
    setState((prev) => ({
      ...prev,
      jobDescription: description,
      error: null
    }));
  };

  return {
    state,
    scoreCandidate,
    updateJobDescription
  };
}
