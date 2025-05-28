import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { CandidateCard } from "./candidate-card";
import type { CandidateListProps } from "./types";

function formatProcessingTime(time?: number) {
  if (!time) return "";
  return ` • Processed in ${(time / 1000).toFixed(1)}s`;
}

export function CandidateList({
  candidates,
  totalProcessed,
  processingTime
}: CandidateListProps) {
  return (
    <div className="space-y-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Candidate Rankings</CardTitle>
          <CardDescription>
            Found {candidates.length} top candidates
            {totalProcessed && ` out of ${totalProcessed} total`}
            {formatProcessingTime(processingTime)}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="max-w-4xl mx-auto space-y-4">
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
