import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Star, User, Mail, Calendar } from "lucide-react";
import type { CandidateCardProps } from "./types";

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-gray-700 bg-gray-50 border-gray-200";
}

function formatAvailability(availability?: string) {
  if (!availability) return "Not specified";
  return availability.replace("-", " ");
}

function renderSkills(candidate: CandidateCardProps["candidate"]) {
  const skills = candidate.skills || [];
  const matchedSkills = candidate.matchedSkills || [];

  return (
    <div className="flex flex-wrap gap-2">
      {skills.slice(0, 8).map((skill) => {
        const isMatched = matchedSkills.includes(skill);
        return (
          <Badge
            key={skill}
            variant={isMatched ? "default" : "outline"}
            className={`text-xs transition-colors duration-150 ${
              isMatched
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {isMatched && <Star className="w-3 h-3 mr-1 fill-current" />}
            {skill}
          </Badge>
        );
      })}
      {skills.length > 8 && (
        <Badge
          variant="outline"
          className="text-xs bg-gray-50 text-gray-500 border-dashed"
        >
          +{skills.length - 8} more
        </Badge>
      )}
    </div>
  );
}

export function CandidateCard({ candidate, index }: CandidateCardProps) {
  return (
    <Card className="group relative overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200 bg-white">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start space-x-4">
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg">
                {index + 1}
              </div>
              {index < 3 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-yellow-800 fill-current" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <User className="w-4 h-4 text-gray-400" />
                <h3 className="text-xl font-bold text-gray-900 truncate">
                  {candidate.name}
                </h3>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="text-sm truncate">{candidate.email}</p>
              </div>
              {candidate.jobTitle && (
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  {candidate.jobTitle}
                </p>
              )}
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl border-2 font-bold text-lg shadow-sm ${getScoreColor(
              candidate.score
            )}`}
          >
            {candidate.score}/100
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                Experience & Location
              </h4>
              <div className="space-y-2">
                <p className="text-gray-700 font-medium">
                  {candidate.experience} years experience
                </p>
                <p className="text-gray-600 flex items-center">
                  <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                  {candidate.location}
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-3 h-3 mr-1 text-gray-400" />
                  Available: {formatAvailability(candidate.availability)}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Star className="w-4 h-4 mr-2 text-gray-500" />
                Skills
                {candidate.matchedSkills &&
                  candidate.matchedSkills.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {candidate.matchedSkills.length} matched
                    </Badge>
                  )}
              </h4>
              {renderSkills(candidate)}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Star className="w-4 h-4 mr-2 text-gray-500" />
                Key Highlights
              </h4>
              <ul className="space-y-2">
                {candidate.highlights.map((highlight, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-700 flex items-start"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span className="leading-relaxed">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {candidate.reasoning && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  AI Assessment
                </h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {candidate.reasoning}
                </p>
              </div>
            )}
          </div>
        </div>

        {candidate.bio && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-gray-500" />
              Professional Summary
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4">
              {candidate.bio}
            </p>
          </div>
        )}

        <div className="absolute inset-0 bg-blue-500/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg" />
      </div>
    </Card>
  );
}
