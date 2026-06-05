import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchFilesForContext, commitMultipleFiles, parseGithubUrl } from '@/lib/github';
import { generateAgentCode } from '@/lib/agent-ai';

const SETUP_REPO_OWNER = process.env.SETUP_REPO_OWNER || 'nukriotarashvili';
const SETUP_REPO_NAME = process.env.SETUP_REPO_NAME || 'set-up-ai';
const SETUP_REPO_BRANCH = process.env.SETUP_REPO_BRANCH || 'main';
const SETUP_FILES_PATHS = (
  process.env.SETUP_FILES ||
  'frontend-rules.md,supabase-schema.md,design-system.md'
).split(',').map((f) => f.trim()).filter(Boolean);

async function fetchSetupContext(octokit: Octokit): Promise<string> {
  try {
    return await fetchFilesForContext(
      octokit,
      SETUP_REPO_OWNER,
      SETUP_REPO_NAME,
      SETUP_REPO_BRANCH,
      SETUP_FILES_PATHS
    );
  } catch (err) {
    console.warn('Set-up რეპოდან ფაილების წამოღება ვერ მოხერხდა', err);
    return '';
  }
}

function buildCombinedSystemPrompt(agentPrompt: string, setupContext: string): string {
  if (!setupContext.trim()) return agentPrompt;

  return `${agentPrompt}

--- GLOBAL PROJECT ARCHITECTURE & DESIGN RULES ---
You MUST strictly follow these rules and patterns extracted from the '${SETUP_REPO_NAME}' repository:
${setupContext}
--------------------------------------------------`;
}

async function resolveTask(taskId: string | undefined, agentRole: string | undefined) {
  if (taskId) {
    const { data: task, error } = await supabaseAdmin
      .from('agent_tasks')
      .select('*, projects(*), agents(*)')
      .eq('id', taskId)
      .single();

    if (task && !error) return task;
  }

  if (!agentRole) throw new Error('Task ვერ მოიძებნა. აირჩიე აგენტი ან მიუთითე taskId.');

  const { data: agent, error: agentError } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('role', agentRole)
    .single();

  if (agentError || !agent) throw new Error(`აგენტი "${agentRole}" ვერ მოიძებნა`);

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .limit(1)
    .single();

  if (projectError || !project) throw new Error('Project ვერ მოიძებნა Supabase-ში');

  const { data: newTask, error: createError } = await supabaseAdmin
    .from('agent_tasks')
    .insert({
      project_id: project.id,
      agent_id: agent.id,
      status: 'pending',
    })
    .select('*, projects(*), agents(*)')
    .single();

  if (createError || !newTask) throw new Error('Task შექმნა ვერ მოხერხდა');

  return newTask;
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

function normalizeAiFiles(files: AiRawFile[]) {
  return files
    .map((file) => ({
      path: file.path || file.file_path || file.name || file.filename || '',
      content: file.content || file.code || file.text || '',
    }))
    .filter((file) => file.path && file.content);
}

function parseTargetFiles(targetFiles: unknown): string[] {
  if (!Array.isArray(targetFiles)) return [];

  return targetFiles
    .map((f) => String(f).trim())
    .filter((f) => f && !f.startsWith('http') && !f.includes('github.com'));
}

async function runDirectAgent(body: {
  repoUrl: string;
  branch?: string;
  targetFiles: unknown;
  userTask: string;
  systemPrompt: string;
  provider?: string;
  agentRole?: string;
}) {
  const filePaths = parseTargetFiles(body.targetFiles);

  if (filePaths.length === 0) {
    throw new Error(
      'სამიზნე ფაილები არასწორია. მიუთითე repo-ს შიგნით ფაილის გზები, მაგ: src/app/page.tsx'
    );
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  const { owner, repo } = parseGithubUrl(body.repoUrl);
  const baseBranch = body.branch?.trim() || 'main';

  const codeContext = await fetchFilesForContext(octokit, owner, repo, baseBranch, filePaths);
  const setupContext = await fetchSetupContext(octokit);
  const combinedSystemPrompt = buildCombinedSystemPrompt(body.systemPrompt, setupContext);

  const provider = (body.provider === 'claude' ? 'claude' : 'gemini') as 'gemini' | 'claude';
  const aiResult = await generateAgentCode(provider, combinedSystemPrompt, body.userTask, codeContext);

  if (!aiResult?.files || !Array.isArray(aiResult.files) || aiResult.files.length === 0) {
    throw new Error('AI-მ არ დააბრუნა ცვლილებები (ცარიელი პასუხი). სცადეთ ინსტრუქციის დაკონკრეტება.');
  }

  const normalizedFiles = normalizeAiFiles(aiResult.files as AiRawFile[]);

  if (normalizedFiles.length === 0) {
    throw new Error('AI-ს პასუხის სტრუქტურა არასწორია (ვერ მოიძებნა path ან content).');
  }

  const roleLabel = body.agentRole || 'agent';
  const newBranchName = `agent-${roleLabel}-${Date.now()}`;
  const prTitle = aiResult.commitMessage || `✨ AI Update: ${roleLabel}`;

  const prUrl = await commitMultipleFiles(
    octokit,
    owner,
    repo,
    baseBranch,
    newBranchName,
    normalizedFiles,
    prTitle,
    prTitle,
    `ეს Pull Request შექმნილია **${roleLabel}** აგენტის მიერ.\n\n**დავალება:** ${body.userTask}`
  );

  return prUrl;
}

export async function POST(request: Request) {
  let taskId: string | undefined;

  try {
    const body = await request.json();
    const { targetFiles, userTask, agentRole, repoUrl, systemPrompt } = body;

    const filePaths = parseTargetFiles(targetFiles);

    if (filePaths.length === 0) {
      throw new Error(
        'სამიზნე ფაილები არასწორია. მიუთითე repo-ს შიგნით ფაილის გზები, მაგ: src/app/page.tsx'
      );
    }

    // Direct mode: repoUrl + systemPrompt from Dashboard (no Supabase task required)
    if (repoUrl?.trim() && systemPrompt?.trim()) {
      const prUrl = await runDirectAgent({
        repoUrl: repoUrl.trim(),
        branch: body.branch,
        targetFiles: filePaths,
        userTask,
        systemPrompt,
        provider: body.provider,
        agentRole,
      });

      return NextResponse.json({ success: true, prUrl });
    }

    const task = await resolveTask(body.taskId, agentRole);
    taskId = task.id;

    await supabaseAdmin.from('agent_tasks').update({ status: 'running' }).eq('id', taskId);

    const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    const { owner, repo } = parseGithubUrl(task.projects.github_repo_url);
    const baseBranch = task.projects.branch || 'main';

    const codeContext = await fetchFilesForContext(octokit, owner, repo, baseBranch, filePaths);
    const setupContext = await fetchSetupContext(octokit);
    const combinedSystemPrompt = buildCombinedSystemPrompt(task.agents.system_prompt, setupContext);

    const provider = (body.provider === 'claude' ? 'claude' : 'gemini') as 'gemini' | 'claude';
    const aiResult = await generateAgentCode(provider, combinedSystemPrompt, userTask, codeContext);

    if (!aiResult?.files || !Array.isArray(aiResult.files) || aiResult.files.length === 0) {
      throw new Error('AI-მ არ დააბრუნა ცვლილებები (ცარიელი პასუხი). სცადეთ ინსტრუქციის დაკონკრეტება.');
    }

    const normalizedFiles = normalizeAiFiles(aiResult.files as AiRawFile[]);

    if (normalizedFiles.length === 0) {
      throw new Error('AI-ს პასუხის სტრუქტურა არასწორია (ვერ მოიძებნა path ან content).');
    }

    const newBranchName = `agent-${task.agents.role}-${Date.now()}`;
    const prUrl = await commitMultipleFiles(
      octokit,
      owner,
      repo,
      baseBranch,
      newBranchName,
      normalizedFiles,
      aiResult.commitMessage || `✨ AI Update: ${task.agents.name}`,
      `✨ AI Update: ${task.agents.name}`,
      `ეს Pull Request შექმნილია **${task.agents.name}** აგენტის მიერ.\n\n**დავალება:** ${userTask}`
    );

    await supabaseAdmin.from('agent_tasks').update({
      status: 'success',
      pull_request_url: prUrl,
      completed_at: new Date().toISOString(),
    }).eq('id', taskId);

    return NextResponse.json({ success: true, prUrl });

  } catch (error: any) {
    console.error("Agent Run Error:", error);
    // ერორის დაფიქსირება ბაზაში
    if (taskId) {
      await supabaseAdmin.from('agent_tasks').update({
        status: 'failed',
        logs: error.message,
        completed_at: new Date().toISOString(),
      }).eq('id', taskId);
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}