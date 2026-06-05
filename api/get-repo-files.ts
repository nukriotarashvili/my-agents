import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';
import { getRepoFileList, parseGithubUrl } from '../src/lib/github';

interface GetRepoFilesBody {
  repoUrl: string;
  branch?: string;
}

function json(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  if (!process.env.GITHUB_PAT) {
    return json(res, 500, { success: false, error: 'GITHUB_PAT არ არის კონფიგურირებული' });
  }

  try {
    const body = (req.body ?? {}) as Partial<GetRepoFilesBody>;
    const repoUrl = body.repoUrl?.trim();
    const branch = body.branch?.trim() || 'main';

    if (!repoUrl) {
      return json(res, 400, { success: false, error: 'repoUrl აუცილებელია' });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
    const { owner, repo } = parseGithubUrl(repoUrl);
    const files = await getRepoFileList(octokit, owner, repo, branch);

    return json(res, 200, { success: true, files });
  } catch (error: unknown) {
    console.error('get-repo-files error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /არასწორი|repoUrl/i.test(message) ? 400 : 500;
    return json(res, status, { success: false, error: message });
  }
}

export const config = {
  maxDuration: 60,
};
