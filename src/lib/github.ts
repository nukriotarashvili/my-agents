import { Octokit } from '@octokit/rest';

export interface AgentFile {
  path: string;
  content: string;
}

export function parseGithubUrl(url: string) {
  const match = url.match(/github\.com\/([^\/]+)\/([^/.]+)/);
  if (!match) throw new Error('არასწორი GitHub URL');
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

const BINARY_FILE_PATTERN = /\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|mp4|mp3|zip|pdf)$/i;

export async function getRepoFileList(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch = 'main'
): Promise<string[]> {
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: refData.object.sha,
  });

  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitData.tree.sha,
    recursive: 'true',
  });

  return (treeData.tree ?? [])
    .filter((item) => item.type === 'blob' && item.path && !BINARY_FILE_PATTERN.test(item.path))
    .map((item) => item.path!);
}

// 1. ფაილების კონტექსტის წამოღება
export async function fetchFilesForContext(
  octokit: Octokit, owner: string, repo: string, branch: string, filePaths: string[]
) {
  const filesContext = [];
  for (const path of filePaths) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
      if (!Array.isArray(data) && data.type === 'file' && data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        filesContext.push(`\n--- File: ${path} ---\n${content}\n-------------------\n`);
      }
    } catch (e) {
      console.warn(`File ${path} not found on branch ${branch}.`);
    }
  }
  return filesContext.join('\n');
}

// 2. მრავალი ფაილის დაქომითება (Git Tree)
export async function commitMultipleFiles(
  octokit: Octokit, owner: string, repo: string, baseBranch: string, 
  newBranchName: string, files: AgentFile[], commitMessage: string, prTitle: string, prBody: string
) {
  // ბაზისური Commit და Tree
  const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
  const baseCommitSha = refData.object.sha;
  
  const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
  const baseTreeSha = commitData.tree.sha;

  // 3. Blobs ყველა ახალი/შეცვლილი ფაილისთვის
  const treeItemsRaw = await Promise.all(
    files.map(async (file) => {
      if (!file.path || typeof file.content !== 'string') return null;

      const { data: blobData } = await octokit.git.createBlob({
        owner,
        repo,
        content: file.content,
        encoding: 'utf-8',
      });

      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blobData.sha,
      };
    })
  );

  const validTreeItems = treeItemsRaw.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  if (validTreeItems.length === 0) {
    throw new Error('ვერ მოხერხდა Git Tree ობიექტების გენერაცია.');
  }

  // 4. ახალი Tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree: validTreeItems,
    base_tree: baseTreeSha,
  });

  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo, message: commitMessage, tree: newTree.sha, parents: [baseCommitSha],
  });

  // ახალი Branch და PR
  await octokit.git.createRef({ owner, repo, ref: `refs/heads/${newBranchName}`, sha: newCommit.sha });
  const { data: prData } = await octokit.pulls.create({
    owner, repo, title: prTitle, body: prBody, head: newBranchName, base: baseBranch,
  });

  return prData.html_url;
}