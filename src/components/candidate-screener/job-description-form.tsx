"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { JobDescriptionFormProps } from "./types";

const MIN_CHARS = 10;
const MAX_CHARS = 200;

export function JobDescriptionForm({
  jobDescription,
  isLoading,
  error,
  onSubmit,
  onJobDescriptionChange
}: JobDescriptionFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (jobDescription.trim().length < MIN_CHARS) {
      return;
    }

    onSubmit(jobDescription.trim());
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onJobDescriptionChange(e.target.value);
  };

  const remainingChars = MAX_CHARS - jobDescription.length;
  const isOverLimit = remainingChars < 0;
  const isUnderLimit = jobDescription.trim().length < MIN_CHARS;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Job Description</CardTitle>
        <CardDescription>
          Describe the position and requirements ({MIN_CHARS}-{MAX_CHARS} characters)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description</Label>
            <Textarea
              id="jobDescription"
              placeholder="e.g., Senior React Developer with 5+ years experience, TypeScript, Node.js, remote work..."
              value={jobDescription}
              onChange={handleChange}
              className={`min-h-[120px] ${isOverLimit ? "border-red-500" : ""}`}
              disabled={isLoading}
            />
            <div className="flex justify-between text-sm">
              <span
                className={`${isOverLimit ? "text-red-500" : "text-gray-500"}`}
              >
                {remainingChars} characters remaining
              </span>
              <span className="text-gray-500">
                {jobDescription.length}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isUnderLimit || isOverLimit}
          >
            {isLoading ? "Generating Rankings..." : "Generate Ranking"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
