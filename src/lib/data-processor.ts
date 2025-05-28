import fs from "fs";
import path from "path";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createCandidateId, type Candidate, type CandidateId, type QuestionAnswer } from "./types";
import { validateCandidate } from "./schemas";

let candidatesCache: ReadonlyArray<Candidate> | null = null;
let lastLoadTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

interface RawCandidateData {
  id?: string;
  name?: string;
  email?: string;
  skills?: string | string[];
  educations?: string | string[];
  experiences?: string | string[];
  jobLocation?: string;
  location?: string;
  jobTitle?: string;
  jobDepartment?: string;
  headline?: string;
  summary?: string;
  creationTime?: string;
  disqualified?: string;
  question1?: string;
  answer1?: string;
  question2?: string;
  answer2?: string;
  question3?: string;
  answer3?: string;
  question4?: string;
  answer4?: string;
  question5?: string;
  answer5?: string;
  question6?: string;
  answer6?: string;
  question7?: string;
  answer7?: string;
  [key: string]: unknown;
}

export function normalizeText(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractKeywords(text: string): ReadonlyArray<string> {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);

  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should"
  ]);

  return words
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 20);
}

function loadCandidatesFromFile(): ReadonlyArray<Candidate> {
  const dataPath = path.join(process.cwd(), "data", "candidates.json");

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Candidates data file not found at: ${dataPath}`);
  }

  try {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const candidatesData = JSON.parse(rawData);

    if (!Array.isArray(candidatesData)) {
      throw new Error("Candidates data must be an array");
    }

    const validCandidates = candidatesData
      .map((candidateData: unknown, index) => {
        try {
          const rawData = candidateData as RawCandidateData;
          
          const skills = processStringField(rawData.skills);
          const education = processStringField(rawData.educations);
          const experience = processStringField(rawData.experiences);

          const questions = [];
          for (let i = 1; i <= 7; i++) {
            const question = rawData[`question${i}`] as string | undefined;
            const answer = rawData[`answer${i}`] as string | undefined;
            if (question && answer) {
              questions.push({ question, answer });
            }
          }

          const experienceYears = extractExperienceYears(
            typeof rawData.experiences === "string" ? rawData.experiences : ""
          );

          const bio = createBioFromData(rawData);

          const processedData = {
            ...rawData,
            id: createCandidateId(rawData.id || `generated-${index}`),
            skills: skills as readonly string[],
            education: education as readonly string[],
            workHistory: experience as readonly string[],
            questions: questions.length > 0 ? (questions as readonly QuestionAnswer[]) : undefined,
            experience: experienceYears,
            bio: bio,
            email: rawData.email || `candidate${index}@example.com`,
            location:
              rawData.jobLocation || rawData.location || "Unknown",
            disqualified: rawData.disqualified === "Yes",
            creationTime: parseCreationTime(rawData.creationTime)
          };

          const validatedCandidate = validateCandidate(processedData);
          
          // Convert the validated candidate to match the Candidate interface exactly
          const candidate: Candidate = {
            id: validatedCandidate.id,
            name: validatedCandidate.name,
            email: validatedCandidate.email,
            experience: validatedCandidate.experience,
            location: validatedCandidate.location,
            bio: validatedCandidate.bio,
            ...(validatedCandidate.jobTitle && { jobTitle: validatedCandidate.jobTitle }),
            ...(validatedCandidate.jobDepartment && { jobDepartment: validatedCandidate.jobDepartment }),
            ...(validatedCandidate.jobLocation && { jobLocation: validatedCandidate.jobLocation }),
            ...(validatedCandidate.headline && { headline: validatedCandidate.headline }),
            ...(validatedCandidate.creationTime && { creationTime: validatedCandidate.creationTime }),
            ...(validatedCandidate.stage && { stage: validatedCandidate.stage }),
            ...(validatedCandidate.tags && { tags: validatedCandidate.tags }),
            ...(validatedCandidate.source && { source: validatedCandidate.source }),
            ...(validatedCandidate.type && { type: validatedCandidate.type }),
            ...(validatedCandidate.summary && { summary: validatedCandidate.summary }),
            ...(validatedCandidate.keywords && { keywords: validatedCandidate.keywords }),
            ...(validatedCandidate.educations && { educations: validatedCandidate.educations }),
            ...(validatedCandidate.experiences && { experiences: validatedCandidate.experiences }),
            ...(validatedCandidate.skills && { skills: [...validatedCandidate.skills] as readonly string[] }),
            ...(validatedCandidate.education && { education: [...validatedCandidate.education] as readonly string[] }),
            ...(validatedCandidate.workHistory && { workHistory: [...validatedCandidate.workHistory] as readonly string[] }),
            ...(validatedCandidate.disqualified !== undefined && { disqualified: validatedCandidate.disqualified }),
            ...(validatedCandidate.disqualifiedAt && { disqualifiedAt: validatedCandidate.disqualifiedAt }),
            ...(validatedCandidate.disqualificationCategory && { disqualificationCategory: validatedCandidate.disqualificationCategory }),
            ...(validatedCandidate.disqualificationReason && { disqualificationReason: validatedCandidate.disqualificationReason }),
            ...(validatedCandidate.disqualificationNote && { disqualificationNote: validatedCandidate.disqualificationNote }),
            ...(validatedCandidate.questions && { questions: [...validatedCandidate.questions] as readonly QuestionAnswer[] }),
            ...(validatedCandidate.availability && { availability: validatedCandidate.availability })
          };
          
          return candidate;
        } catch (error) {
          console.warn(`Invalid candidate data at index ${index}:`, error);
          return null;
        }
      })
      .filter((candidate): candidate is Candidate => candidate !== null);

    console.log(`Loaded ${validCandidates.length} valid candidates`);
    return validCandidates;
  } catch (error) {
    console.error("Error loading candidates:", error);
    throw new Error(`Failed to load candidates: ${error}`);
  }
}

function extractExperienceYears(experienceStr: string): number {
  if (!experienceStr) return 0;

  const yearMatches = experienceStr.match(/(\d+)\+?\s*years?/gi);
  if (yearMatches && yearMatches.length > 0) {
    const years = yearMatches.map((match) => {
      const num = match.match(/(\d+)/);
      return num && num[1] ? parseInt(num[1]) : 0;
    });
    return Math.max(...years);
  }

  const jobCount = (experienceStr.match(/\|/g) || []).length + 1;
  return Math.min(jobCount * 2, 20);
}

function parseCreationTime(timeStr: string | undefined): string | undefined {
  if (!timeStr) return undefined;

  try {
    if (timeStr.includes("/")) {
      const parts = timeStr.split("  ");
      const datePart = parts[0];
      const timePart = parts[1];

      if (datePart) {
        const dateParts = datePart.split("/");
        const day = dateParts[0];
        const month = dateParts[1];
        const year = dateParts[2];

        if (day && month && year) {
          const dateString = `${year}-${month.padStart(2, "0")}-${day.padStart(
            2,
            "0"
          )}`;

          if (timePart) {
            return new Date(`${dateString}T${timePart}`).toISOString();
          } else {
            return new Date(dateString).toISOString();
          }
        }
      }
    }

    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    return undefined;
  } catch {
    console.warn(`Failed to parse creation time: ${timeStr}`);
    return undefined;
  }
}

function processStringField(field: unknown): string[] {
  if (!field) return [];
  if (typeof field === "string")
    return field.split("|").map((s) => s.trim());
  if (Array.isArray(field)) return field.map((s) => String(s).trim());
  return [];
}

function createBioFromData(candidateData: RawCandidateData): string {
  const parts = [];

  if (candidateData.headline) {
    parts.push(candidateData.headline);
  }

  if (candidateData.summary) {
    parts.push(candidateData.summary);
  }

  if (candidateData.jobTitle) {
    parts.push(`Currently working as ${candidateData.jobTitle}`);
  }

  if (candidateData.skills) {
    const skills =
      typeof candidateData.skills === "string"
        ? candidateData.skills.split("|").slice(0, 5).join(", ")
        : "";
    if (skills) {
      parts.push(`Skills include: ${skills}`);
    }
  }

  const bio = parts.join(". ");
  return bio.length >= 20
    ? bio
    : `Professional with experience in ${
        candidateData.jobTitle || "software development"
      }. Skilled in various technologies and committed to delivering quality work.`;
}

export const getCandidates = cache(
  async (): Promise<ReadonlyArray<Candidate>> => {
    const now = Date.now();

    if (candidatesCache && now - lastLoadTime < CACHE_DURATION) {
      return candidatesCache;
    }

    candidatesCache = loadCandidatesFromFile();
    lastLoadTime = now;

    return candidatesCache;
  }
);

export const getCachedCandidates = unstable_cache(
  async (): Promise<ReadonlyArray<Candidate>> => {
    return loadCandidatesFromFile();
  },
  ["candidates"],
  { revalidate: 3600 }
);

export async function getCandidateById(
  id: CandidateId
): Promise<Candidate | null> {
  const candidates = await getCandidates();
  return candidates.find((candidate) => candidate.id === id) || null;
}

export async function searchCandidates(
  query: string,
  limit: number = 50
): Promise<ReadonlyArray<Candidate>> {
  const candidates = await getCandidates();
  const queryKeywords = extractKeywords(query);

  if (queryKeywords.length === 0) {
    return candidates.slice(0, limit);
  }

  const scoredCandidates = candidates
    .map((candidate) => {
      const candidateText = [
        candidate.name,
        candidate.bio,
        ...(candidate.skills || []),
        candidate.location,
        ...(candidate.workHistory || []),
        ...(candidate.education || [])
      ].join(" ");

      const candidateKeywords = extractKeywords(candidateText);
      const matchCount = queryKeywords.filter((keyword) =>
        candidateKeywords.some(
          (ck) => ck.includes(keyword) || keyword.includes(ck)
        )
      ).length;

      return {
        candidate,
        score: matchCount / queryKeywords.length
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.candidate);

  return scoredCandidates;
}

export function deduplicateCandidates(
  candidates: ReadonlyArray<Candidate>
): ReadonlyArray<Candidate> {
  const seen = new Set<string>();
  const deduplicated: Candidate[] = [];

  for (const candidate of candidates) {
    const key = `${normalizeText(candidate.email)}_${normalizeText(
      candidate.name
    )}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(candidate);
    } else {
      console.log(
        `Duplicate candidate found: ${candidate.name} (${candidate.email})`
      );
    }
  }

  return deduplicated;
}

export function preprocessCandidates(
  candidates: ReadonlyArray<Candidate>
): ReadonlyArray<Candidate> {
  return candidates.map((candidate) => ({
    ...candidate,
    bio: normalizeText(candidate.bio),
    skills: candidate.skills
      ? candidate.skills.map((skill) => normalizeText(skill))
      : [],
    location: normalizeText(candidate.location),
    workHistory: candidate.workHistory || [],
    education: candidate.education || []
  }));
}

export async function getCandidateBatches(
  batchSize: number = 10
): Promise<ReadonlyArray<ReadonlyArray<Candidate>>> {
  const candidates = await getCandidates();
  const batches: Candidate[][] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }

  return batches;
}

export async function getCandidateStats() {
  const candidates = await getCandidates();

  const skills = new Set<string>();
  const locations = new Map<string, number>();
  let totalExperience = 0;

  candidates.forEach((candidate) => {
    if (candidate.skills) {
      candidate.skills.forEach((skill) => skills.add(skill));
    }

    const location = candidate.location;
    locations.set(location, (locations.get(location) || 0) + 1);

    totalExperience += candidate.experience;
  });

  return {
    totalCandidates: candidates.length,
    uniqueSkills: skills.size,
    topSkills: Array.from(skills).slice(0, 20),
    locations: Object.fromEntries(locations),
    averageExperience: totalExperience / candidates.length,
    availabilityDistribution: candidates.reduce((acc, candidate) => {
      const availability = candidate.availability || "not-available";
      acc[availability] = (acc[availability] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

export function invalidateCandidatesCache(): void {
  candidatesCache = null;
  lastLoadTime = 0;
}
