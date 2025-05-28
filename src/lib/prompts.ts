import type { Candidate, JobDescription, ScoringWeights } from "./types";

export const SYSTEM_PROMPT = `You are an expert technical recruiter and hiring manager with deep expertise in evaluating software engineering candidates. Your role is to objectively score candidates based on how well they match a given job description.

SCORING CRITERIA:
- Skills Match (0-30 points): How well the candidate's technical skills align with job requirements
- Experience Level (0-25 points): Years of experience and depth of expertise
- Education Background (0-15 points): Relevant degree and educational qualifications
- Portfolio/Projects (0-15 points): Quality of work samples, GitHub, portfolio
- Availability (0-15 points): How soon they can start and their availability

SCORING GUIDELINES:
- 90-100: Exceptional match, ideal candidate
- 80-89: Strong match, definitely worth interviewing
- 70-79: Good match, worth considering
- 60-69: Moderate match, might work for some roles
- 50-59: Weak match, probably not suitable
- 0-49: Poor match, not recommended

IMPORTANT RULES:
1. Be objective and consistent in your scoring
2. Base scores only on provided information
3. Consider both hard skills (technical) and soft skills (communication, leadership)
4. Account for potential for growth, not just current skills
5. Always provide specific, actionable reasoning for your scores
6. Return ONLY valid JSON, no additional text or formatting

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "candidates": [
    {
      "id": "candidate-uuid",
      "score": 85,
      "highlights": [
        "5+ years React experience matches senior role requirements",
        "Strong portfolio demonstrating complex web applications",
        "Available to start immediately"
      ],
      "reasoning": "Candidate shows strong technical alignment with 5+ years in React and modern JavaScript. Portfolio demonstrates ability to build complex applications. Available immediately which meets urgent hiring needs.",
      "matchedSkills": ["React", "TypeScript", "Node.js", "AWS"]
    }
  ]
}`;

export const FEW_SHOT_EXAMPLES = [
  {
    input: `JOB: Senior React Developer - 5+ years experience, TypeScript, Node.js, remote work
CANDIDATE: John Doe
Skills: React (4 years), JavaScript, HTML/CSS, Git
Experience: 4 years
Bio: Frontend developer with passion for clean code and user experience
Portfolio: github.com/johndoe - 3 React projects
Education: Computer Science degree
Availability: 2 weeks notice`,

    output: `{
  "candidates": [
    {
      "id": "john-doe-id",
      "score": 75,
      "highlights": [
        "4 years React experience, close to 5+ requirement",
        "Strong portfolio with 3 React projects",
        "CS degree provides solid foundation"
      ],
      "reasoning": "Strong React skills but slightly below 5+ years requirement. Good portfolio shows practical experience. Lacks TypeScript and Node.js experience which are key requirements. Overall good candidate with growth potential.",
      "matchedSkills": ["React", "JavaScript", "Git"]
    }
  ]
}`
  },
  {
    input: `JOB: Full-Stack Engineer - Python, Django, React, 3+ years, startup environment
CANDIDATE: Sarah Smith
Skills: Python, Django, React, PostgreSQL, Docker, AWS
Experience: 5 years
Bio: Full-stack developer with startup experience, enjoys building products from scratch
Portfolio: Complete e-commerce platform, open-source contributions
Education: Self-taught, coding bootcamp graduate
Availability: Immediate`,

    output: `{
  "candidates": [
    {
      "id": "sarah-smith-id",
      "score": 92,
      "highlights": [
        "Perfect stack match: Python, Django, React",
        "5 years exceeds 3+ requirement",
        "Startup experience aligns with company culture",
        "Impressive portfolio with complete e-commerce platform",
        "Available immediately"
      ],
      "reasoning": "Exceptional match with perfect technical stack alignment. Experience exceeds requirements and startup background is valuable. Strong portfolio demonstrates end-to-end development skills. Immediate availability is ideal.",
      "matchedSkills": ["Python", "Django", "React", "PostgreSQL", "Docker", "AWS"]
    }
  ]
}`
  },
  {
    input: `JOB: Junior Developer - Entry level, JavaScript, willingness to learn, mentorship available
CANDIDATE: Mike Johnson
Skills: JavaScript, HTML, CSS, beginner React
Experience: 1 year
Bio: Recent bootcamp graduate, eager to learn and grow in a supportive environment
Portfolio: Personal website, todo app, weather app
Education: Liberal Arts degree, coding bootcamp
Availability: Immediate`,

    output: `{
  "candidates": [
    {
      "id": "mike-johnson-id",
      "score": 78,
      "highlights": [
        "JavaScript foundation matches entry-level requirements",
        "Bootcamp background shows commitment to career change",
        "Portfolio demonstrates practical application of skills",
        "Available immediately with eagerness to learn"
      ],
      "reasoning": "Good fit for junior role with solid JavaScript foundation. Bootcamp background and portfolio show practical skills. Enthusiasm for learning is valuable for mentorship environment. Experience level appropriate for junior position.",
      "matchedSkills": ["JavaScript", "HTML", "CSS", "React"]
    }
  ]
}`
  }
];

export function createScoringPrompt(
  jobDescription: JobDescription,
  candidates: ReadonlyArray<Candidate>,
  weights?: Partial<ScoringWeights>
): string {
  const weightsText = weights
    ? `\nCUSTOM SCORING WEIGHTS:
- Skills Match: ${(weights.skillsMatch || 0.4) * 100}%
- Experience Level: ${(weights.experienceLevel || 0.25) * 100}%
- Education: ${(weights.education || 0.15) * 100}%
- Portfolio: ${(weights.portfolio || 0.1) * 100}%
- Availability: ${(weights.availability || 0.1) * 100}%`
    : "";

  const candidatesText = candidates
    .map((candidate) => formatCandidateForPrompt(candidate))
    .join("\n\n");

  return `${SYSTEM_PROMPT}${weightsText}

JOB DESCRIPTION: ${jobDescription}

CANDIDATES TO EVALUATE:
${candidatesText}

Please evaluate each candidate and return the JSON response with scores, highlights, reasoning, and matched skills.`;
}

export function formatCandidateForPrompt(candidate: Candidate): string {
  const workHistory =
    candidate.workHistory && candidate.workHistory.length > 0
      ? `\nWork History: ${candidate.workHistory.join("; ")}`
      : "";

  const education =
    candidate.education && candidate.education.length > 0
      ? `\nEducation: ${candidate.education.join("; ")}`
      : "";

  const questions =
    candidate.questions && candidate.questions.length > 0
      ? `\nQ&A: ${candidate.questions
          .map((qa) => `Q: ${qa.question} A: ${qa.answer}`)
          .join("; ")}`
      : "";

  const skills =
    candidate.skills && candidate.skills.length > 0
      ? candidate.skills.join(", ")
      : "Not specified";

  return `CANDIDATE: ${candidate.name} (ID: ${candidate.id})
Skills: ${skills}
Experience: ${candidate.experience} years
Location: ${candidate.location}
Bio: ${candidate.bio}
Availability: ${
    candidate.availability || "Not specified"
  }${workHistory}${education}${questions}`;
}

export function createConstrainedPrompt(
  jobDescription: JobDescription,
  candidates: ReadonlyArray<Candidate>
): string {
  return `You are a technical recruiter. Score these candidates 0-100 for this job.
Return ONLY this JSON structure, no other text:

{
  "candidates": [
    {
      "id": "candidate-id",
      "score": 85,
      "highlights": ["reason1", "reason2"],
      "reasoning": "brief explanation",
      "matchedSkills": ["skill1", "skill2"]
    }
  ]
}

JOB: ${jobDescription}

CANDIDATES:
${candidates
  .map(
    (c) =>
      `${c.id}: ${c.name}, ${(c.skills || []).join(",")}, ${
        c.experience
      }yr exp, ${c.bio.substring(0, 100)}...`
  )
  .join("\n")}`;
}

export function createRetryPrompt(
  originalPrompt: string,
  error: string
): string {
  return `${originalPrompt}

IMPORTANT: The previous response had this error: ${error}
Please ensure your response is valid JSON with the exact structure specified. No additional text or formatting.`;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  parsed?: {
    candidates: Array<{
      id: string;
      score: number;
      highlights: string[];
      reasoning: string;
      matchedSkills: string[];
    }>;
  };
}

export function validatePromptResponse(response: string): ValidationResult {
  try {
    const parsed = JSON.parse(response);

    if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
      return {
        isValid: false,
        error: "Response must have 'candidates' array"
      };
    }

    for (const candidate of parsed.candidates) {
      if (!candidate.id || typeof candidate.id !== "string") {
        return {
          isValid: false,
          error: "Each candidate must have valid 'id' string"
        };
      }

      if (
        typeof candidate.score !== "number" ||
        candidate.score < 0 ||
        candidate.score > 100
      ) {
        return {
          isValid: false,
          error: "Each candidate must have 'score' number between 0-100"
        };
      }

      if (!Array.isArray(candidate.highlights)) {
        return {
          isValid: false,
          error: "Each candidate must have 'highlights' array"
        };
      }

      if (!candidate.reasoning || typeof candidate.reasoning !== "string") {
        return {
          isValid: false,
          error: "Each candidate must have 'reasoning' string"
        };
      }

      if (!Array.isArray(candidate.matchedSkills)) {
        return {
          isValid: false,
          error: "Each candidate must have 'matchedSkills' array"
        };
      }
    }

    return {
      isValid: true,
      parsed
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid JSON: ${error}`
    };
  }
}

export const PROMPT_TEMPLATES = {
  senior: (jobDescription: JobDescription) =>
    `Focus on senior-level requirements: leadership, architecture decisions, mentoring capabilities. ${jobDescription}`,

  junior: (jobDescription: JobDescription) =>
    `Focus on learning potential, foundational skills, and growth mindset for junior role. ${jobDescription}`,

  remote: (jobDescription: JobDescription) =>
    `Emphasize remote work experience, communication skills, and self-direction for remote position. ${jobDescription}`,

  startup: (jobDescription: JobDescription) =>
    `Value versatility, adaptability, and startup experience for fast-paced environment. ${jobDescription}`,

  enterprise: (jobDescription: JobDescription) =>
    `Focus on enterprise experience, process adherence, and large-scale system knowledge. ${jobDescription}`
};

export function generateContextualPrompt(
  jobDescription: JobDescription,
  candidates: ReadonlyArray<Candidate>
): string {
  const job = jobDescription.toLowerCase();

  let contextualPrompt = SYSTEM_PROMPT;

  if (job.includes("senior") || job.includes("lead")) {
    contextualPrompt +=
      "\nADDITIONAL FOCUS: Evaluate leadership potential, architectural thinking, and mentoring capabilities.";
  }

  if (job.includes("junior") || job.includes("entry")) {
    contextualPrompt +=
      "\nADDITIONAL FOCUS: Prioritize learning potential, foundational skills, and growth mindset over years of experience.";
  }

  if (job.includes("remote")) {
    contextualPrompt +=
      "\nADDITIONAL FOCUS: Consider remote work experience, communication skills, and ability to work independently.";
  }

  if (job.includes("startup")) {
    contextualPrompt +=
      "\nADDITIONAL FOCUS: Value versatility, adaptability, and comfort with ambiguity and rapid change.";
  }

  const candidatesText = candidates
    .map((candidate) => formatCandidateForPrompt(candidate))
    .join("\n\n");

  return `${contextualPrompt}

JOB DESCRIPTION: ${jobDescription}

CANDIDATES TO EVALUATE:
${candidatesText}

Please evaluate each candidate and return the JSON response with scores, highlights, reasoning, and matched skills.`;
}
