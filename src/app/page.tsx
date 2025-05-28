import type { Metadata } from "next";
import { PageHeader } from "@/components/candidate-screener/page-header";
import { PageLayout } from "@/components/candidate-screener/page-layout";
import { CandidateScreenerClient } from "@/components/candidate-screener/candidate-screener-client";

export const metadata: Metadata = {
  title: "Candidate Screening System | AI-Powered Recruitment",
  description:
    "Get AI-powered candidate rankings based on skills match, experience, and qualifications. Streamline your recruitment process with intelligent candidate screening.",
  keywords: [
    "candidate screening",
    "AI recruitment",
    "talent acquisition",
    "hiring",
    "candidate ranking"
  ],
  openGraph: {
    title: "Candidate Screening System",
    description: "AI-powered candidate rankings for efficient recruitment",
    type: "website"
  }
};

export default function HomePage() {
  return (
    <PageLayout>
      <PageHeader
        title="Candidate Screening System"
        description="Enter a job description to get AI-powered candidate rankings based on skills match, experience, and qualifications."
      />
      <CandidateScreenerClient />
    </PageLayout>
  );
}
