# LLM-Powered Candidate Screening System

A TypeScript-first Next.js 15 application that uses AI to rank and score candidates based on job descriptions. Built with modern React 19 features, Vercel AI SDK, and shadcn/ui components.

## Demo

<div>
    <a href="https://www.loom.com/share/413560feef7b4ffe9362d88f18199c92">
      <p>Candidate Screening System Demo - Watch Video</p>
    </a>
    <a href="https://www.loom.com/share/413560feef7b4ffe9362d88f18199c92">
      <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/413560feef7b4ffe9362d88f18199c92-6e3b1f6ddc1df67b-full-play.gif">
    </a>
  </div>

## Features

- 🤖 **AI-Powered Scoring**: Uses OpenAI GPT-4 or Anthropic Claude for intelligent candidate evaluation
- 📊 **Comprehensive Ranking**: Scores candidates 0-100 based on skills, experience, education, portfolio, and availability
- 🎯 **Smart Matching**: Highlights matched skills and provides detailed reasoning for each score
- ⚡ **Batch Processing**: Parallel processing with rate limiting and retry logic
- 🎨 **Modern UI**: Beautiful interface built with shadcn/ui and Tailwind CSS
- 🔒 **Type Safety**: 100% TypeScript with strict configuration and runtime validation
- 🔄 **Dual Strategy Scoring**: Structured output with fallback to constrained text parsing

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript 5+ with strict configuration
- **UI**: shadcn/ui components + Tailwind CSS 4
- **AI**: Vercel AI SDK with OpenAI/Anthropic support
- **Validation**: Zod for runtime type checking
- **Testing**: Jest + Testing Library
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: Node.js 22)
- pnpm
- OpenAI API key or Anthropic API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/javierriveros/candidate-screener.git
   cd candidate-screener
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```env
   # Required: Choose one AI provider
   OPENAI_API_KEY=your_openai_api_key_here
   # OR
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   
   # Optional
   LLM_PROVIDER=openai              # openai | anthropic
   LLM_MODEL=gpt-4.1-mini           # gpt-4.1-mini | gpt-3.5-turbo | claude-4-opus | claude-4-sonnet
   ```

4. **Convert candidate data** (if using Excel file)
   ```bash
   pnpm run convert-data
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Basic Workflow

1. Enter a job description (10-200 characters)
2. Click "Generate Ranking" to process candidates
3. Review top candidates with scores, highlights, and reasoning
4. Analyze matched skills and experience alignment

### API Endpoints

#### POST `/api/score`
Score candidates based on job description.

**Request:**
```json
{
  "jobDescription": "Senior React Developer with 5+ years experience...",
  "maxResults": 30,
  "weights": {
    "skillsMatch": 0.4,
    "experienceLevel": 0.25,
    "education": 0.15,
    "portfolio": 0.1,
    "availability": 0.1
  }
}
```

**Response:**
```json
{
  "candidates": [
    {
      "id": "uuid",
      "name": "John Doe",
      "score": 85,
      "highlights": ["5+ years React experience", "Strong portfolio"],
      "reasoning": "Excellent technical match...",
      "matchedSkills": ["React", "TypeScript", "Node.js"]
    }
  ],
  "totalProcessed": 199,
  "processingTime": 5420,
  "modelUsed": "gpt-4.1-mini"
}
```

#### GET `/api/score`
Health check and system information.

## Project Structure

```
candidate-screener/
├── src/
│   ├── app/
│   │   ├── api/score/route.ts     # API endpoint
│   │   ├── page.tsx               # Main page
│   │   └── layout.tsx             # Root layout
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   └── candidate-screener.tsx # Main component
│   ├── hooks/                     # Custom React hooks
│   └── lib/
│       ├── types.ts               # TypeScript definitions
│       ├── schemas.ts             # Zod validation schemas
│       ├── ai-service.ts          # AI integration with Vercel AI SDK
│       ├── data-processor.ts      # Data loading and preprocessing
│       ├── prompts.ts             # Prompt engineering templates
│       └── utils.ts               # Utility functions
├── data/
│   ├── candidates.json            # Processed data
│   └── *.xlsx                     # Source Excel file
└── scripts/
    └── convert-excel.ts           # Data conversion
```

## Key Architecture Features

### AI Integration
- **Provider Abstraction**: Easy switching between OpenAI and Anthropic
- **Dual Strategy**: Structured output with fallback parsing
- **Retry Logic**: Exponential backoff for rate limits
- **Batch Processing**: Parallel processing with concurrency limits

### Type Safety
- **Strict TypeScript**: Branded types and discriminated unions
- **Runtime Validation**: Zod schemas matching TypeScript types
- **Error Handling**: Comprehensive error types and recovery

### Performance
- **Caching**: Next.js unstable_cache for data
- **Parallel Processing**: Concurrent batch processing
- **Code Splitting**: Optimized bundle sizes

## Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Quality Assurance
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript checking
pnpm test             # Run tests
pnpm test:coverage    # Generate coverage

# Data Processing
pnpm convert-data     # Convert Excel to JSON
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes* | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | Yes* | - | Anthropic API key |
| `LLM_PROVIDER` | No | `openai` | AI provider (`openai` \| `anthropic`) |
| `LLM_MODEL` | No | `gpt-4.1-mini` | Model name |

*Either OpenAI or Anthropic API key is required

## Testing

- **Unit Tests**: Jest + Testing Library
- **Type Safety**: TypeScript strict mode
- **Linting**: ESLint with Next.js configuration
- **API Testing**: Mock LLM responses

## Technical Highlights

### Prompt Engineering
- Expert recruiter persona with weighted evaluation criteria
- Few-shot examples for consistent AI behavior
- Context-aware prompts based on job description keywords
- Structured output with JSON schema validation

### Error Handling
- Discriminated union types for type-safe error handling
- Graceful degradation from structured to text parsing
- Exponential backoff retry logic for API failures
- Clear user feedback for all error states

### Data Flow
1. User input validation with Zod schemas
2. Cached candidate data retrieval
3. Parallel AI batch processing with retry logic
4. Result aggregation and sorting
5. Type-safe response formatting
