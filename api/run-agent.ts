import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';
import {
  AgentFile,
  commitMultipleFiles,
  fetchFilesForContext,
  parseGithubUrl,
} from '../src/lib/github';
import { generateAgentCode } from '../src/lib/agent-ai';
import { resolveModelId, type AiProvider } from '../src/lib/ai-models';

type Provider = AiProvider;

interface RunAgentBody {
  repoUrl: string;
  targetFiles: string[];
  provider: Provider;
  modelId: string;
  systemPrompt: string;
  userTask: string;
  branch?: string;
}

type AiRawFile = {
  path?: string;
  file_path?: string;
  name?: string;
  filename?: string;
  content?: string;
  code?: string;
  text?: string;
};

interface AiResult {
  files: AgentFile[];
  commitMessage: string;
}

function json(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

function sanitizeJsonResponse(raw: string): string {
  return raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
}

function normalizeAiFiles(files: AiRawFile[]): AgentFile[] {
  return files
    .map((file) => ({
      path: file.path || file.file_path || file.name || file.filename || '',
      content: file.content || file.code || file.text || '',
    }))
    .filter((file) => file.path && file.content);
}

async function fetchRepoCodeContext(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  targetFiles: string[]
): Promise<string> {
  const paths = targetFiles
    .map((f) => f.trim())
    .filter((f) => f && !f.startsWith('http') && !f.includes('github.com'));

  if (paths.length === 0) {
    throw new Error('targetFiles ცარიელია ან არასწორია');
  }

  const context = await fetchFilesForContext(octokit, owner, repo, branch, paths);
  if (!context.trim()) {
    throw new Error('მითითებული ფაილები ვერ მოიძებნა მოცემულ repo/branch-ზე');
  }

  return context;
}

function validateBody(body: unknown): RunAgentBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body არასწორია');
  }

  const data = body as Partial<RunAgentBody>;

  if (!data.repoUrl?.trim()) throw new Error('repoUrl აუცილებელია');
  if (!Array.isArray(data.targetFiles) || data.targetFiles.length === 0) {
    throw new Error('targetFiles აუცილებელია (არაცარიელი მასივი)');
  }
  if (data.provider !== 'claude' && data.provider !== 'gemini') {
    throw new Error("provider უნდა იყოს 'claude' ან 'gemini'");
  }
  if (!data.modelId?.trim()) throw new Error('modelId აუცილებელია');
  resolveModelId(data.modelId.trim(), data.provider);

  if (!data.systemPrompt?.trim()) throw new Error('systemPrompt აუცილებელია');
  if (!data.userTask?.trim()) throw new Error('userTask აუცილებელია');

  return {
    repoUrl: data.repoUrl.trim(),
    targetFiles: data.targetFiles,
    provider: data.provider,
    modelId: data.modelId.trim(),
    systemPrompt: data.systemPrompt.trim(),
    userTask: data.userTask.trim(),
    branch: data.branch?.trim() || 'main',
  };
}

async function runAgentWorkflow(body: RunAgentBody): Promise<{ prUrl: string }> {
  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  const { owner, repo } = parseGithubUrl(body.repoUrl);
  const branch = body.branch || 'main';

  const codeContext = await fetchRepoCodeContext(
    octokit,
    owner,
    repo,
    branch,
    body.targetFiles
  );

  const aiResult = await generateAgentCode(
    body.provider,
    body.modelId,
    body.systemPrompt,
    body.userTask,
    codeContext
  );

  if (!aiResult?.files || !Array.isArray(aiResult.files) || aiResult.files.length === 0) {
    throw new Error('AI-მ არ დააბრუნა ცვლილებები (ცარიელი პასუხი)');
  }

  const normalizedFiles = normalizeAiFiles(aiResult.files as AiRawFile[]);
  if (normalizedFiles.length === 0) {
    throw new Error('AI-ს პასუხის სტრუქტურა არასწორია (path ან content აკლია)');
  }

  const commitMessage =
    aiResult.commitMessage?.trim() || `AI update: ${body.userTask.slice(0, 72)}`;
  const newBranchName = `agent-update-${Date.now()}`;

  const prUrl = await commitMultipleFiles(
    octokit,
    owner,
    repo,
    branch,
    newBranchName,
    normalizedFiles,
    commitMessage,
    `✨ AI Update`,
    `**Task:** ${body.userTask}\n\n**Provider:** ${body.provider}\n\n**Model:** ${body.modelId}\n\n**Files changed:** ${normalizedFiles.length}`
  );

  return { prUrl };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  if (!process.env.GITHUB_PAT) {
    return json(res, 500, { success: false, error: 'GITHUB_PAT არ არის კონფიგურირებული' });
  }

  try {
    const body = validateBody(req.body);
    const { prUrl } = await runAgentWorkflow(body);
    return json(res, 200, { success: true, prUrl });
  } catch (error: unknown) {
    console.error('run-agent error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /აუცილებელია|უნდა იყოს|არასწორია|targetFiles/i.test(message) ? 400 : 500;
    return json(res, status, { success: false, error: message });
  }
}

export const config = {
  maxDuration: 300,
};
