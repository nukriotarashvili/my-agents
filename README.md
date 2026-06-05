<div align="center">

# ECC Control Panel

**Autonomous AI Agent Orchestration for GitHub Repositories**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

AI-აგენტები, რომლებიც GitHub რეპოზიტორიებს სკანირებენ, კოდს აკეთებენ და Pull Request-ს ხსნიან.

[დაწყება](#-სწრაფი-დაწყება) · [გამოყენება](#-გამოყენება) · [API](#-api-endpoints) · [Deploy](#-vercel-deployment)

</div>

---

## რა არის ეს?

**ECC Control Panel** არის web-based control panel, სადაც:

1. ირჩევ GitHub repo-ს და სამიზნე ფაილებს
2. აირჩევ AI მოდელს (Claude / Gemini) და აგენტის როლს
3. წერ ინსტრუქციას
4. აგენტი ცვლილებებს აკეთებს და **Pull Request**-ს ქმნის

---

## ფუნქციონალი

| ფუნქცია | აღწერა |
|---------|--------|
| **Repository Scan** | GitHub repo-ს ფაილების სიის მიღება branch-ის მიხედვით |
| **File Picker** | Searchable checkbox სია `.ts`, `.tsx`, `.js`, `.css` ფაილებისთვის |
| **AI Engine** | Claude & Gemini მოდელების დინამიური არჩევა |
| **Agent Roles** | Architect, Performance, DB Reviewer, Security |
| **Automated PR** | Branch → Commit → Pull Request GitHub-ზე |
| **Setup Context** | `set-up-ai` repo-დან global rules-ის ჩართვა |

---

## არქიტექტურა

```mermaid
flowchart LR
    UI[Dashboard UI] -->|POST| Scan[/api/get-repo-files]
    UI -->|GET| Models[/api/get-models]
    UI -->|POST| Run[/api/run-agent]
    Scan --> GH[(GitHub API)]
    Run --> GH
    Run --> AI[Claude / Gemini]
    Run --> PR[Pull Request]
```

---

## Tech Stack

| Layer | ტექნოლოგია |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind v4, shadcn/ui |
| 3D Background | Spline |
| GitHub | Octokit |
| AI | Anthropic SDK, Google Generative AI |
| Database | Supabase (optional) |
| Deploy | Vercel |

---

## ⚡ სწრაფი დაწყება

### 1. Clone & Install

```bash
git clone https://github.com/nukriotarashvili/my-agents.git
cd my-agents
npm install
```

### 2. Environment Variables

პროექტის **root**-ში შექმენი `.env.local`:

```env
# GitHub (აუცილებელი)
GITHUB_PAT=ghp_xxxxxxxx

# AI — მინიმუმ ერთი
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxx

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxx

# Global setup context (optional)
SETUP_REPO_OWNER=nukriotarashvili
SETUP_REPO_NAME=set-up-ai
SETUP_REPO_BRANCH=main
SETUP_FILES=frontend-rules.md,supabase-schema.md,design-system.md
```

> `.env.example` ფაილიც root-შია — დააკოპირე და შეავსე.

### 3. Run

```bash
npm run dev
```

გახსენი **http://localhost:3000**

> UI-ის სრული სტილები (glassmorphism, neon accents) მხოლოდ `npm run dev` ან production build-ით მუშაობს. Static preview-ში CSS შეიძლება არ ჩაიტვირთოს.

---

## 📖 გამოყენება

### ნაბიჯი 1 — Repository Target

```
┌─────────────────────────────────────┐
│  GitHub URL: https://github.com/... │
│  Branch:     main                   │
│  [ Scan Repo ]                      │
│  ☑ src/app/page.tsx                 │
│  ☑ src/components/Dashboard.tsx     │
└─────────────────────────────────────┘
```

1. შეიყვანე **GitHub Repository URL**
2. მიუთითე **branch** (default: `main`)
3. დააჭირე **Scan Repo**
4. მონიშნე checkbox-ებით სამიზნე ფაილები

### ნაბიჯი 2 — Agent Configuration

1. **AI Engine** — აირჩიე მოდელი (Anthropic / Google Gemini)
2. **Agent Role** — Frontend Architect, Security Reviewer, და ა.შ.
3. **Task Instructions** — დეტალური ინსტრუქცია
4. **Run Agent**

### ნაბიჯი 3 — შედეგი

- წარმატება → **Pull Request** ლინკი UI-ში
- PR branch: `agent-{role}-{timestamp}`

---

## Agent Roles

| Key | როლი | ფოკუსი |
|-----|------|--------|
| `architect` | Frontend Architect | კომპონენტები, არქიტექტურა |
| `performance` | Performance Optimizer | rendering, bundle size |
| `db-reviewer` | Database Reviewer | schema, queries |
| `security` | Security Reviewer | vulnerabilities, secure code |

---

## 🔌 API Endpoints

<details>
<summary><strong>GET /api/get-models</strong> — AI მოდელების სია</summary>

```json
{
  "success": true,
  "models": [
    { "id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "provider": "gemini" },
    { "id": "claude-3-5-sonnet-20240620", "name": "Claude 3.5 Sonnet", "provider": "claude" }
  ]
}
```

</details>

<details>
<summary><strong>POST /api/get-repo-files</strong> — repo ფაილების scan</summary>

```json
// Request
{ "repoUrl": "https://github.com/owner/repo", "branch": "main" }

// Response
{ "success": true, "files": ["src/app/page.tsx", "src/lib/github.ts"] }
```

</details>

<details>
<summary><strong>POST /api/run-agent</strong> — agent გაშვება + PR</summary>

```json
// Request
{
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "provider": "gemini",
  "modelId": "gemini-2.5-flash",
  "agentRole": "architect",
  "systemPrompt": "You are a senior Frontend Architect...",
  "userTask": "Refactor the dashboard component",
  "targetFiles": ["src/components/Dashboard.tsx"]
}

// Response
{ "success": true, "prUrl": "https://github.com/owner/repo/pull/42" }
```

</details>

---

## 📁 პროექტის სტრუქტურა

```
my-agents/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── get-models/       ← AI მოდელები
│   │   │   ├── get-repo-files/   ← repo scan
│   │   │   └── run-agent/        ← agent + PR
│   │   └── page.tsx
│   ├── components/
│   │   ├── Dashboard.tsx         ← მთავარი UI
│   │   ├── GlassCard.tsx
│   │   └── SplineBackground.tsx
│   └── lib/
│       ├── agent-ai.ts           ← Claude + Gemini
│       ├── ai-models.ts
│       └── github.ts
├── api/                          ← Vercel serverless
└── .env.local                    ← secrets (არ იდე git-ში)
```

---

## 🚀 Vercel Deployment

1. Push repo → GitHub
2. [vercel.com](https://vercel.com) → **Import Project**
3. Framework: **Next.js** (auto-detect)
4. Environment Variables → `.env.local`-ის ცვლადები
5. **Deploy**

---

## 🛠 Troubleshooting

| პრობლემა | გამოსავალი |
|----------|-----------|
| UI სტილების გარეშე (თეთრი ფონი) | გაუშვი `npm run dev`; Vercel-ზე არ გამოიყენო catch-all rewrite |
| `Cannot find module './331.js'` | `Remove-Item -Recurse -Force .next` → `npm run dev` |
| `GITHUB_PAT არ არის` | `.env.local` root-ში, valid PAT `repo` scope-ით |
| Anthropic credit error | Billing შეავსე ან Gemini მოდელი აირჩიე |
| Gemini 503 | სცადე სხვა მოდელი ან რამდენიმე წუთი დაელოდე |
| Loading models... ჩაჭედვა | dev server გაშვებულია? `/api/get-models` მუშაობს? |

---

<div align="center">

**Built with Next.js · Deployed on Vercel**

Private project · [nukriotarashvili/my-agents](https://github.com/nukriotarashvili/my-agents)

</div>
