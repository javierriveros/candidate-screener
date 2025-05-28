import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { EmptyStateProps } from "./types";

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="max-w-2xl mx-auto text-center p-8">
      <CardTitle className="mb-2">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </Card>
  );
}
