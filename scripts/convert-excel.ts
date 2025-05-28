import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import crypto from "crypto";

interface RawCandidate {
  Name?: string;
  "Job title"?: string;
  "Job department"?: string;
  "Job location"?: string;
  Headline?: string;
  "Creation time"?: string;
  Stage?: string;
  Tags?: string;
  Source?: string;
  Type?: string;
  Summary?: string;
  Keywords?: string;
  Educations?: string;
  Experiences?: string;
  Skills?: string;
  Disqualified?: string;
  "Disqualified at"?: string;
  "Disqualification category"?: string;
  "Disqualification reason"?: string;
  "Disqualification note"?: string;
  "Question 1"?: string;
  "Answer 1"?: string;
  "Question 2"?: string;
  "Answer 2"?: string;
  "Question 3"?: string;
  "Answer 3"?: string;
  "Question 4"?: string;
  "Answer 4"?: string;
  "Question 5"?: string;
  "Answer 5"?: string;
  "Question 6"?: string;
  "Answer 6"?: string;
  "Question 7"?: string;
  "Answer 7"?: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  experience: number;
  location: string;
  bio: string;
  jobTitle?: string;
  jobDepartment?: string;
  jobLocation?: string;
  headline?: string;
  creationTime?: string;
  stage?: string;
  tags?: string;
  source?: string;
  type?: string;
  summary?: string;
  keywords?: string;
  educations?: string;
  experiences?: string;
  skills?: string[];
  education?: string[];
  workHistory?: string[];
  disqualified?: boolean;
  disqualifiedAt?: string;
  disqualificationCategory?: string;
  disqualificationReason?: string;
  disqualificationNote?: string;
  questions?: QuestionAnswer[];
  availability?: "immediate" | "2-weeks" | "1-month" | "not-available";
}

function generateUUID(): string {
  return crypto.randomUUID();
}

function cleanText(text: string | undefined): string {
  if (!text) return "";
  return text.toString().trim().replace(/\s+/g, " ").replace(/\n/g, " ");
}

function parseSkills(skillsText: string | undefined): string[] {
  if (!skillsText) return [];
  
  return skillsText
    .toString()
    .split(/[,;|\n]/)
    .map(skill => cleanText(skill))
    .filter(skill => skill.length > 0 && skill.toLowerCase() !== "n/a")
    .slice(0, 15);
}

function parseExperience(experienceText: string | undefined): number {
  if (!experienceText) return 0;
  
  // Count job entries as rough estimate (each job = ~2 years)
  const jobCount = (experienceText.match(/\|/g) || []).length + 1;
  return Math.min(jobCount * 2, 20); // Cap at 20 years
}

function parseAvailability(stageText: string | undefined, disqualified: boolean): "immediate" | "2-weeks" | "1-month" | "not-available" {
  if (disqualified) return "not-available";
  
  if (!stageText) return "immediate";
  
  const text = stageText.toLowerCase();
  
  if (text.includes("immediate") || text.includes("available") || text.includes("ready")) {
    return "immediate";
  }
  if (text.includes("2 week") || text.includes("two week")) {
    return "2-weeks";
  }
  if (text.includes("1 month") || text.includes("one month") || text.includes("30 day")) {
    return "1-month";
  }
  if (text.includes("not available") || text.includes("unavailable") || text.includes("disqualified")) {
    return "not-available";
  }
  
  return "immediate";
}

function extractEmail(name: string, index: number): string {
  const emailName = name.toLowerCase().replace(/\s+/g, ".");
  return `${emailName}.${index}@example.com`;
}

function createBio(summary: string | undefined, headline: string | undefined, jobTitle: string | undefined, skills: string[]): string {
  let bio = "";
  
  if (headline) {
    bio = cleanText(headline);
  } else if (summary) {
    bio = cleanText(summary);
  } else if (jobTitle) {
    bio = `Professional working as ${jobTitle}`;
  } else {
    bio = "Professional with experience in software development";
  }
  
  if (skills.length > 0 && bio.length < 100) {
    bio += `. Skilled in ${skills.slice(0, 5).join(", ")}`;
  }
  
  if (bio.length < 50) {
    bio += ". Seeking new opportunities to contribute to innovative projects and grow professionally in a dynamic team environment.";
  }
  
  return bio.slice(0, 1000);
}

function parseLocation(locationText: string | undefined): string {
  if (!locationText) return "Remote";
  
  const cleaned = cleanText(locationText);
  if (!cleaned || cleaned.toLowerCase() === "n/a") return "Remote";
  
  return cleaned;
}

function parseStringArray(text: string | undefined): string[] {
  if (!text || text.trim() === "") {
    return [];
  }

  return text.split("|").map(entry => entry.trim()).filter(entry => entry);
}

function parseQuestions(row: RawCandidate): QuestionAnswer[] {
  const questions: QuestionAnswer[] = [];
  
  for (let i = 1; i <= 7; i++) {
    const question = row[`Question ${i}` as keyof RawCandidate];
    const answer = row[`Answer ${i}` as keyof RawCandidate];
    
    if (question && answer) {
      questions.push({
        question: cleanText(question),
        answer: cleanText(answer)
      });
    }
  }
  
  return questions;
}

function convertExcelToJSON(): void {
  try {
    const excelPath = path.join(__dirname, "../data/ZIPDEV - Candidate Database Code challenge.xlsx");
    const outputPath = path.join(__dirname, "../data/candidates.json");
    
    console.log("Reading Excel file:", excelPath);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      throw new Error("No worksheets found in the Excel file");
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`Worksheet "${sheetName}" not found`);
    }
    
    console.log("Converting to JSON...");
    const rawData = XLSX.utils.sheet_to_json<RawCandidate>(worksheet);
    
    console.log(`Found ${rawData.length} raw records`);
    if (rawData.length > 0 && rawData[0]) {
      console.log("Sample columns:", Object.keys(rawData[0]));
    }
    
    const candidates = rawData.map((row, index) => {
      try {
        const name = cleanText(row["Name"] || `Candidate ${index + 1}`);
        const jobTitle = cleanText(row["Job title"]);
        const jobDepartment = cleanText(row["Job department"]);
        const jobLocation = parseLocation(row["Job location"]);
        const headline = cleanText(row["Headline"]);
        const creationTime = cleanText(row["Creation time"]);
        const stage = cleanText(row["Stage"]);
        const tags = cleanText(row["Tags"]);
        const source = cleanText(row["Source"]);
        const type = cleanText(row["Type"]);
        const summary = cleanText(row["Summary"]);
        const keywords = cleanText(row["Keywords"]);
        const educations = cleanText(row["Educations"]);
        const experiences = cleanText(row["Experiences"]);
        const skillsText = cleanText(row["Skills"]);
        const disqualified = row["Disqualified"] === "Yes";
        const disqualifiedAt = cleanText(row["Disqualified at"]);
        const disqualificationCategory = cleanText(row["Disqualification category"]);
        const disqualificationReason = cleanText(row["Disqualification reason"]);
        const disqualificationNote = cleanText(row["Disqualification note"]);
        
        const skills = parseSkills(skillsText);
        const education = parseStringArray(educations);
        const workHistory = parseStringArray(experiences);
        const questions = parseQuestions(row);
        const experience = parseExperience(experiences);
        const availability = parseAvailability(stage, disqualified);
        const bio = createBio(summary, headline, jobTitle, skills);
        
        const candidate: Candidate = {
          id: generateUUID(),
          name,
          email: extractEmail(name, index),
          experience,
          location: jobLocation || "Remote",
          bio,
          ...(jobTitle && { jobTitle }),
          ...(jobDepartment && { jobDepartment }),
          ...(jobLocation && { jobLocation }),
          ...(headline && { headline }),
          ...(creationTime && { creationTime }),
          ...(stage && { stage }),
          ...(tags && { tags }),
          ...(source && { source }),
          ...(type && { type }),
          ...(summary && { summary }),
          ...(keywords && { keywords }),
          ...(educations && { educations }),
          ...(experiences && { experiences }),
          ...(skills.length > 0 && { skills }),
          ...(education.length > 0 && { education }),
          ...(workHistory.length > 0 && { workHistory }),
          ...(disqualified && { disqualified }),
          ...(disqualifiedAt && { disqualifiedAt }),
          ...(disqualificationCategory && { disqualificationCategory }),
          ...(disqualificationReason && { disqualificationReason }),
          ...(disqualificationNote && { disqualificationNote }),
          ...(questions.length > 0 && { questions }),
          ...(availability && { availability })
        };
        
        return candidate;
      } catch (error) {
        console.warn(`Error processing row ${index + 1}:`, error instanceof Error ? error.message : String(error));
        console.warn("Row data:", row);
        return null;
      }
    }).filter((candidate): candidate is Candidate => candidate !== null);
    
    console.log(`Successfully converted ${candidates.length} candidates`);
    
    const validCandidates = candidates.filter(c => 
      c.name && 
      c.name !== "Candidate" && 
      c.bio.length >= 20
    );
    
    console.log(`${validCandidates.length} candidates passed validation`);
    
    fs.writeFileSync(outputPath, JSON.stringify(validCandidates, null, 2));
    console.log(`Candidates saved to: ${outputPath}`);
    
    if (validCandidates.length > 0) {
      console.log("\nSample candidates:");
      console.log("1.", JSON.stringify(validCandidates[0], null, 2));
      if (validCandidates.length > 1) {
        console.log("2.", JSON.stringify(validCandidates[1], null, 2));
      }
    }
    
    console.log("\n=== Conversion Statistics ===");
    console.log(`Total rows processed: ${rawData.length}`);
    console.log(`Valid candidates: ${validCandidates.length}`);
    console.log(`Disqualified candidates: ${validCandidates.filter(c => c.disqualified).length}`);
    console.log(`Candidates with skills: ${validCandidates.filter(c => c.skills && c.skills.length > 0).length}`);
    console.log(`Candidates with questions: ${validCandidates.filter(c => c.questions && c.questions.length > 0).length}`);
    
    const skillCounts: Record<string, number> = {};
    validCandidates.forEach(c => {
      if (c.skills) {
        c.skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      }
    });
    
    const topSkills = Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    console.log("\nTop 10 skills:");
    topSkills.forEach(([skill, count]) => {
      console.log(`  ${skill}: ${count} candidates`);
    });
    
  } catch (error) {
    console.error("Error converting Excel to JSON:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

convertExcelToJSON(); 