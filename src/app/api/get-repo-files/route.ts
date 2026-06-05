import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getRepoFileList, parseGithubUrl } from '@/lib/github';

export async function POST(request: Request) {
  try {
    const { repoUrl, branch = 'main' } = await request.json();

    if (!repoUrl?.trim()) {
      return NextResponse.json({ success: false, error: 'repoUrl აუცილებელია' }, { status: 400 });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    const { owner, repo } = parseGithubUrl(repoUrl.trim());
    const files = await getRepoFileList(octokit, owner, repo, branch.trim() || 'main');

    return NextResponse.json({ success: true, files });
  } catch (error: unknown) {
    console.error('get-repo-files error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
