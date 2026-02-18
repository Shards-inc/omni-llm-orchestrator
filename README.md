# 🌐 Omni-LLM Orchestrator

**Production-ready orchestration layer that unifies 12 LLM families with intelligent weighted routing and synthesis.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://reactjs.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11-398ccb)](https://trpc.io/)

---

## 🎯 Overview

Omni-LLM Orchestrator is an intelligent multi-model orchestration system that automatically routes queries to the most suitable LLM based on **intent classification** and **weighted synthesis**. Instead of treating all models equally, it assigns trust scores based on domain expertise for superior results.

### Key Features

- **🎯 Intent-Based Routing**: Automatically classifies queries into 10 categories (coding, trading, writing, research, etc.)
- **⚖️ Weighted Synthesis**: Trust scores (0.0-1.0) ensure domain experts have more influence
- **💰 Cost Optimization**: Only 2-4 relevant models called per query, reducing costs by 60-80%
- **🔒 Secure**: Zero hardcoded API keys, all credentials managed via environment variables
- **🚀 Production-Ready**: Built with React 19, tRPC 11, Express 4, and Tailwind 4

---

## 🏗️ Architecture

```
┌─────────────┐
│   User      │
│   Query     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Intent Classification (Cohere) │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Routing Config (routing.yaml)  │
│  - 10 Intent Categories         │
│  - Weighted Model Selection     │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Multi-Model Orchestration      │
│  (OpenRouter API)               │
│  - ChatGPT, Claude, Gemini      │
│  - Grok, DeepSeek, Qwen         │
│  - Kimi, Manus, Copilot         │
│  - LLaMA, Genspark, Perplexity  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Weighted Synthesis             │
│  - Combine responses            │
│  - Apply trust scores           │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────┐
│   Final     │
│  Response   │
└─────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- API Keys:
  - [OpenRouter](https://openrouter.ai/keys) - Multi-model LLM access
  - [Cohere](https://dashboard.cohere.com/api-keys) - Intent classification
  - [JSONBin.io](https://jsonbin.io/app/keys) - Chat history storage (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/ayais12210-hub/omni-llm-orchestrator.git
cd omni-llm-orchestrator

# Install dependencies
pnpm install

# Set up environment variables
# Add your API keys to the environment:
# OPENROUTER_API_KEY=your_key_here
# COHERE_API_KEY=your_key_here
# JSONBIN_API_KEY=your_key_here (optional)

# Start development server
pnpm dev
```

Visit `http://localhost:3000` to see the application.

---

## 📦 Tech Stack

### Frontend
- **React 19** - UI framework
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - Component library
- **Wouter** - Lightweight routing
- **tRPC Client** - Type-safe API calls

### Backend
- **Express 4** - Web server
- **tRPC 11** - End-to-end type safety
- **Drizzle ORM** - Database toolkit
- **Superjson** - JSON serialization

### Integrations
- **OpenRouter** - Unified LLM API gateway
- **Cohere** - Intent classification
- **JSONBin.io** - Chat history persistence

---

## 🎨 Features

### 1. Interactive Chat Interface
- **Auto Mode**: Intelligent model selection based on query intent
- **Manual Mode**: Choose from 11 specific models
- **Voice Input/Output**: Speech-to-text and text-to-speech
- **File Uploads**: Support for images, documents, audio, video
- **Response Styles**: Normal, Learning, Concise, Explanatory, Formal

### 2. Weighted Routing System
- **10 Intent Categories**: Coding, Trading, Writing, Research, Automation, Translation, Creativity, Humour, Mathematics, Multimodal
- **Trust Scores**: Each model has a weight (0.0-1.0) indicating domain expertise
- **Dynamic Selection**: Top-weighted models automatically chosen per intent

### 3. Configuration-Driven
- **routing.yaml**: Intent-to-model mappings with weights
- **config.yaml**: Model registry with metadata
- **No Code Changes**: Update routing without touching orchestration logic

---

## 📂 Project Structure

```
omni-llm-orchestrator/
├── client/                  # Frontend React app
│   ├── public/             # Static assets
│   │   ├── routing.yaml    # Routing configuration
│   │   └── config.yaml     # Model registry
│   └── src/
│       ├── pages/          # Page components
│       │   ├── Home.tsx    # Landing page
│       │   ├── Chat.tsx    # Chat interface
│       │   └── Docs.tsx    # Documentation
│       ├── components/     # Reusable UI components
│       └── lib/trpc.ts     # tRPC client setup
├── server/                  # Backend Express + tRPC
│   ├── routers.ts          # API route definitions
│   ├── db.ts               # Database helpers
│   └── _core/              # Framework internals
├── drizzle/                # Database schema & migrations
│   └── schema.ts
└── shared/                 # Shared types & constants
```

---

## 🔧 Configuration

### routing.yaml Example

```yaml
intents:
  coding:
    description: "Programming, debugging, code generation"
    models:
      - id: openai/gpt-4.1
        weight: 0.40
        rationale: "Industry-leading code understanding"
      - id: anthropic/claude-3.5-sonnet
        weight: 0.35
        rationale: "Excellent at explaining complex logic"
      - id: microsoft/copilot-codex
        weight: 0.25
        rationale: "Specialized for code completion"
```

### Environment Variables

Required environment variables:
- `OPENROUTER_API_KEY` - OpenRouter API key for multi-model access
- `COHERE_API_KEY` - Cohere API key for intent classification
- `JSONBIN_API_KEY` - JSONBin.io API key for chat history (optional)
- `DATABASE_URL` - MySQL/TiDB connection string
- `JWT_SECRET` - Session cookie signing secret

---

## 🧪 API Endpoints (tRPC)

### `orchestrator.classifyIntent`
Classifies user query into one of 10 intent categories using Cohere.

```typescript
const result = await trpc.orchestrator.classifyIntent.mutate({
  query: "Write a Python function to sort a list"
});
// Returns: { intent: "coding", confidence: 0.92 }
```

### `orchestrator.orchestrate`
Routes query to optimal model(s) and returns synthesized response.

```typescript
const result = await trpc.orchestrator.orchestrate.mutate({
  query: "Explain quantum computing",
  selectedModel: "auto" // or specific model ID
});
// Returns: { response: "...", model: "...", intent: "..." }
```

### `orchestrator.getModelsForIntent`
Retrieves weighted model list for a specific intent.

```typescript
const result = await trpc.orchestrator.getModelsForIntent.query({
  intent: "trading"
});
// Returns: { models: [...], description: "..." }
```

---

## 🎯 Supported Models

| Family | Model | Provider | Best For |
|--------|-------|----------|----------|
| ChatGPT | GPT-4.1 | OpenAI | General reasoning, coding |
| Claude | Claude 3.5 Sonnet | Anthropic | Long-form writing, analysis |
| Gemini | Gemini 2.5 Pro | Google | Multimodal, research |
| Grok | Grok 2 Beta | xAI | Humor, creative tasks |
| DeepSeek | DeepSeek R1 | DeepSeek | Trading, quantitative analysis |
| Qwen | Qwen 2.5 72B | Alibaba | Multilingual, translation |
| Kimi | Kimi K2 | Moonshot | Translation, localization |
| Manus | Manus 1 | Manus AI | Automation, workflows |
| Copilot | Copilot Codex | Microsoft | Code generation |
| LLaMA | LLaMA 3.1 70B | Meta | Open-source research |
| Genspark | Spark 1 | Genspark | Trend scanning |
| Perplexity | Sonar Large | Perplexity | Real-time web search |

---

## 🛠️ Development

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Database migrations
pnpm db:push

# Format code
pnpm format
```

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

## 🙏 Acknowledgments

- **OpenRouter** - Unified LLM API gateway
- **Cohere** - Intent classification API
- **shadcn/ui** - Beautiful component library
- **tRPC** - End-to-end type safety

---

## 📧 Contact

Built by Ayai Singh · Powered by OpenRouter

**Live Demo**: [https://omni-llm-orchestrator.manus.space](https://omni-llm-orchestrator.manus.space)

**Documentation**: [https://omni-llm-orchestrator.manus.space/docs](https://omni-llm-orchestrator.manus.space/docs)

