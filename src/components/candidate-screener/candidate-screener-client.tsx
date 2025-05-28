"use client";

import { useCandidateScoring } from "@/hooks/use-candidate-scoring";
import { JobDescriptionForm } from "./job-description-form";
import { CandidateList } from "./candidate-list";
import { LoadingState } from "./loading-state";
import { EmptyState } from "./empty-state";

export function CandidateScreenerClient() {
  const { state, scoreCandidate, updateJobDescription } = useCandidateScoring();

  const renderContent = () => {
    if (state.isLoading) {
      return <LoadingState />;
    }

    if (state.results) {
      if (state.results.length === 0) {
        return (
          <EmptyState
            title="No Candidates Found"
            description="No candidates match your job description criteria. Try adjusting your requirements."
          />
        );
      }

      return (
        <CandidateList
          candidates={state.results}
          totalProcessed={state.totalProcessed}
          processingTime={state.processingTime}
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-8">
      <JobDescriptionForm
        jobDescription={state.jobDescription}
        isLoading={state.isLoading}
        error={state.error}
        onSubmit={scoreCandidate}
        onJobDescriptionChange={updateJobDescription}
      />

      {renderContent()}
    </div>
  );
}
