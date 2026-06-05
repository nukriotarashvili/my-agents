import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchFilesForContext, commitMultipleFiles, parseGithubUrl } from '@/lib/github';
import { generateAgentCode } from '@/lib/agent-ai';

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

export async function POST(request: Request) {
  let taskId: string | undefined;

  try {
    const body = await request.json();
    const { targetFiles, userTask, agentRole } = body;

    const task = await resolveTask(body.taskId, agentRole);
    taskId = task.id;

    const filePaths = (targetFiles ?? [])
      .map((f: string) => f.trim())
      .filter((f: string) => f && !f.startsWith('http') && !f.includes('github.com'));

    if (filePaths.length === 0) {
      throw new Error(
        'სამიზნე ფაილები არასწორია. მიუთითე repo-ს შიგნით ფაილის გზები, მაგ: src/app/page.tsx'
      );
    }

    await supabaseAdmin.from('agent_tasks').update({ status: 'running' }).eq('id', taskId);

    const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    const { owner, repo } = parseGithubUrl(task.projects.github_repo_url);
    const baseBranch = task.projects.branch || 'main';

    // 3. GitHub-დან კოდის წამოღება
    const codeContext = await fetchFilesForContext(octokit, owner, repo, baseBranch, filePaths);

    // 4. AI-სთვის კოდის გადაცემა და პასუხის მიღება
    const provider = body.provider || 'claude'; // default-ად იყოს claude
    const aiResult = await generateAgentCode(provider, task.agents.system_prompt, userTask, codeContext);

    // 5. GitHub-ზე Git Tree-თ ატვირთვა და PR-ის გახსნა
    const newBranchName = `agent-${task.agents.role}-${Date.now()}`;
    const prUrl = await commitMultipleFiles(
      octokit,
      owner,
      repo,
      baseBranch,
      newBranchName,
      aiResult.files,
      aiResult.commitMessage,
      `✨ AI Update: ${task.agents.name}`,
      `ეს Pull Request შექმნილია **${task.agents.name}** აგენტის მიერ.\n\n**დავალება:** ${userTask}`
    );

    // 6. ოპერაციის წარმატებით დასრულების დაფიქსირება ბაზაში
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