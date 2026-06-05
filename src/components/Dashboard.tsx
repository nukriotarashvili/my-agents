'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Play,
  GitPullRequest,
  Terminal,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FolderSearch,
  Search,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GlassCard } from '@/components/GlassCard';
import { AGENT_ROLES, type AgentRoleKey } from '@/lib/agent-roles';

const SplineBackground = dynamic(() => import('@/components/SplineBackground'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0a0a0b] z-0" />,
});

type StatusState =
  | { type: 'idle' }
  | { type: 'success'; prUrl: string }
  | { type: 'error'; message: string };

function filterCodeFiles(files: string[]) {
  return files.filter(
    (path) =>
      !path.includes('node_modules') &&
      !path.startsWith('.next/') &&
      !path.startsWith('dist/') &&
      /\.(tsx?|jsx?|css|json|md)$/.test(path)
  );
}

export function Dashboard() {
  const [provider, setProvider] = useState('gemini');
  const [agentRole, setAgentRole] = useState<AgentRoleKey | undefined>(undefined);
  const [userTask, setUserTask] = useState('');
  const [repoUrl, setRepoUrl] = useState('https://github.com/nukriotarashvili/sales-app');
  const [branch, setBranch] = useState('main');
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [targetFiles, setTargetFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<StatusState>({ type: 'idle' });

  const filteredFiles = repoFiles.filter((file) =>
    file.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFile = (path: string, checked: boolean) => {
    setTargetFiles((prev) =>
      checked ? [...prev, path] : prev.filter((f) => f !== path)
    );
  };

  const handleScanRepo = async () => {
    if (!repoUrl.trim()) {
      setStatus({ type: 'error', message: 'გთხოვთ, მიუთითოთ GitHub repo URL.' });
      return;
    }

    setScanning(true);
    setSearchQuery('');
    setTargetFiles([]);
    setStatus({ type: 'idle' });

    try {
      const response = await fetch('/api/get-repo-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), branch: branch.trim() || 'main' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({ type: 'error', message: data.error || 'ფაილების ჩატვირთვა ვერ მოხერხდა.' });
        return;
      }

      const codeFiles = filterCodeFiles(data.files as string[]);

      if (codeFiles.length === 0) {
        setStatus({ type: 'error', message: 'კოდის ფაილები ვერ მოიძებნა ამ repo-ში.' });
        return;
      }

      setRepoFiles(codeFiles);
    } catch {
      setStatus({ type: 'error', message: 'სერვერთან კავშირი ვერ მოხერხდა.' });
    } finally {
      setScanning(false);
    }
  };

  const handleRunAgent = async () => {
    if (!agentRole || !userTask.trim() || targetFiles.length === 0) {
      setStatus({
        type: 'error',
        message: 'აირჩიეთ აგენტი, მინიმუმ ერთი ფაილი და შეავსეთ ინსტრუქცია.',
      });
      return;
    }

    setRunning(true);
    setStatus({ type: 'idle' });

    const roleConfig = AGENT_ROLES[agentRole];

    try {
      const response = await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || 'main',
          provider,
          agentRole,
          systemPrompt: roleConfig.systemPrompt,
          userTask: userTask.trim(),
          targetFiles,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus({ type: 'success', prUrl: data.prUrl });
      } else {
        setStatus({ type: 'error', message: data.error || 'დაფიქსირდა შეცდომა.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'სერვერთან კავშირი ვერ მოხერხდა.' });
    } finally {
      setRunning(false);
    }
  };

  const isBusy = scanning || running;

  return (
    <div className="relative min-h-screen bg-[#0a0a0b] text-zinc-300 overflow-hidden font-mono selection:bg-purple-500/30">
      <SplineBackground />

      <div className="relative z-10 p-6 md:p-12 w-full min-h-screen bg-black/20 backdrop-blur-[2px]">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] backdrop-blur-md">
              <Terminal className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
                ECC Control Panel
              </h1>
              <p className="text-sm text-zinc-400 mt-1 drop-shadow-md">
                Autonomous AI Agent Orchestration
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white tracking-tight">
              AI Agent Command Center
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column — repo scan & file picker */}
            <GlassCard
              title="Repository Target"
              description="სკანირება და სამიზნე ფაილების არჩევა"
              icon={<FolderSearch className="w-5 h-5 text-blue-400" />}
              accent="blue"
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  GitHub Repository URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="https://github.com/owner/repo"
                    className="bg-black/50 border-white/10 text-white focus-visible:ring-blue-500/50 flex-1"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={isBusy}
                  />
                  <Input
                    placeholder="main"
                    className="bg-black/50 border-white/10 text-white focus-visible:ring-blue-500/50 sm:w-28"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={isBusy}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleScanRepo}
                disabled={isBusy}
                className="w-full bg-black/50 border-white/10 text-blue-400 hover:text-blue-300 hover:bg-white/5 hover:border-blue-500/30"
              >
                {scanning ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    სკანირება...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FolderSearch className="w-4 h-4" />
                    Scan Repo
                  </span>
                )}
              </Button>

              {repoFiles.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      placeholder="მოძებნე ფაილი..."
                      className="pl-9 bg-black/40 border-white/10 text-sm text-zinc-300 focus-visible:ring-purple-500/50 h-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isBusy}
                    />
                  </div>

                  <div
                    role="listbox"
                    aria-multiselectable
                    className="h-56 overflow-y-auto rounded-md border border-white/10 bg-black/40 p-2 custom-scrollbar space-y-0.5"
                  >
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map((file) => {
                        const checked = targetFiles.includes(file);
                        return (
                          <label
                            key={file}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors text-sm ${
                              checked
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'hover:bg-white/5 text-zinc-400 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleFile(file, e.target.checked)}
                              disabled={isBusy}
                              className="h-4 w-4 rounded border-white/20 bg-black/60 text-purple-500 focus:ring-purple-500/50 accent-purple-500"
                            />
                            <FileCode className="w-4 h-4 shrink-0 opacity-50" />
                            <span className="truncate">{file}</span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-zinc-500 text-sm">
                        ფაილი &quot;{searchQuery}&quot; ვერ მოიძებნა
                      </div>
                    )}
                  </div>

                  {targetFiles.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-emerald-400">მონიშნულია {targetFiles.length} ფაილი</p>
                      <button
                        type="button"
                        onClick={() => setTargetFiles([])}
                        className="text-zinc-500 hover:text-zinc-300"
                        disabled={isBusy}
                      >
                        გასუფთავება
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border border-dashed border-white/10 rounded-md bg-black/20 text-zinc-600 text-sm text-center px-4">
                  დააჭირეთ &quot;Scan Repo&quot;-ს ფაილების სანახავად
                </div>
              )}
            </GlassCard>

            {/* Right column — agent config & run */}
            <GlassCard
              title="Agent Configuration"
              description="AI პროვაიდერი, როლი და დავალება"
              icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
              accent="emerald"
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  AI Provider
                </label>
                <Select value={provider} onValueChange={setProvider} disabled={isBusy}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white focus:ring-emerald-500/50">
                    <SelectValue placeholder="აირჩიე პროვაიდერი" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121214] border-white/10 text-white">
                    <SelectItem value="gemini">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Agent Role
                </label>
                <Select
                  value={agentRole}
                  onValueChange={(v) => setAgentRole(v as AgentRoleKey)}
                  disabled={isBusy}
                >
                  <SelectTrigger className="bg-black/50 border-white/10 text-white focus:ring-emerald-500/50">
                    <SelectValue placeholder="აირჩიე აგენტის როლი" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121214] border-white/10 text-white">
                    {(Object.entries(AGENT_ROLES) as [AgentRoleKey, (typeof AGENT_ROLES)[AgentRoleKey]][]).map(
                      ([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Task Instructions
                </label>
                <Textarea
                  placeholder="აღწერე, რა უნდა გააკეთოს აგენტმა არჩეულ ფაილებში..."
                  className="min-h-[140px] bg-black/50 border-white/10 text-white focus-visible:ring-emerald-500/50 resize-y"
                  value={userTask}
                  onChange={(e) => setUserTask(e.target.value)}
                  disabled={isBusy}
                />
              </div>

              {status.type === 'error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{status.message}</span>
                </div>
              )}

              {status.type === 'success' && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-emerald-400 text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>აგენტმა წარმატებით დაასრულა მუშაობა!</span>
                  </div>
                  <a
                    href={status.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded hover:bg-emerald-500/30 transition-colors whitespace-nowrap"
                  >
                    <GitPullRequest className="w-4 h-4" />
                    ნახე Pull Request
                  </a>
                </div>
              )}

              <Button
                onClick={handleRunAgent}
                disabled={isBusy}
                className="w-full bg-white text-black hover:bg-zinc-200 transition-all font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] h-12"
              >
                {running ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    აგენტი მუშაობს...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4 fill-black" />
                    Run Agent
                  </span>
                )}
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
