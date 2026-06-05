'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Play, Bot, GitPullRequest, Terminal, Sparkles, CheckCircle2, AlertCircle, FileCode, FolderSearch, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SplineBackground = dynamic(() => import('@/components/SplineBackground'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0a0a0b] z-0" />,
});

export default function AICommandCenter() {
  const [provider, setProvider] = useState('claude');
  const [agent, setAgent] = useState('');
  const [task, setTask] = useState('');
  const [repoUrl, setRepoUrl] = useState('https://github.com/nukriotarashvili/sales-app');
  const [branch, setBranch] = useState('main');
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string; prUrl?: string }>({ type: 'idle' });

  const filteredFiles = repoFiles.filter((file) =>
    file.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFile = (path: string) => {
    setSelectedFiles((prev) =>
      prev.includes(path) ? prev.filter((f) => f !== path) : [...prev, path]
    );
  };

  const handleFetchFiles = async () => {
    if (!repoUrl.trim()) {
      setStatus({ type: 'error', message: 'გთხოვთ, მიუთითოთ GitHub repo URL.' });
      return;
    }

    setLoadingFiles(true);
    setSearchQuery('');
    setSelectedFiles([]);
    setStatus({ type: 'idle' });

    try {
      const response = await fetch('/api/repo-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), branch: branch.trim() || 'main' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({ type: 'error', message: data.error || 'ფაილების ჩატვირთვა ვერ მოხერხდა.' });
        return;
      }

      const codeFiles = (data.files as string[]).filter(
        (path) =>
          !path.includes('node_modules') &&
          !path.startsWith('.next/') &&
          !path.startsWith('dist/') &&
          /\.(tsx?|jsx?|css|json|md)$/.test(path)
      );

      if (codeFiles.length === 0) {
        setStatus({ type: 'error', message: 'კოდის ფაილები ვერ მოიძებნა ამ repo-ში.' });
        return;
      }

      setRepoFiles(codeFiles);
    } catch {
      setStatus({ type: 'error', message: 'სერვერთან კავშირი ვერ მოხერხდა.' });
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleRunAgent = async () => {
    if (!agent || !task || selectedFiles.length === 0) {
      setStatus({ type: 'error', message: 'გთხოვთ, აირჩიოთ აგენტი, ფაილები და შეავსოთ ინსტრუქცია.' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'idle' });

    try {
      const response = await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          agentRole: agent,
          userTask: task,
          targetFiles: selectedFiles,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', prUrl: data.prUrl });
      } else {
        setStatus({ type: 'error', message: data.error || 'დაფიქსირდა შეცდომა.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'სერვერთან კავშირი ვერ მოხერხდა.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0b] text-zinc-300 overflow-hidden font-mono selection:bg-purple-500/30">
      <SplineBackground />

      <div className="relative z-10 p-6 md:p-12 w-full h-full min-h-screen bg-black/20 backdrop-blur-[2px]">
        <header className="mb-12 flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] backdrop-blur-md">
              <Terminal className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">ECC Control Panel</h1>
              <p className="text-sm text-zinc-400 mt-1 drop-shadow-md">Autonomous AI Agent Orchestration</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="space-y-6 lg:col-span-1">
            <Card className="bg-[#121214]/80 border-white/5 shadow-xl backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <Bot className="w-5 h-5 text-blue-400" />
                  კონფიგურაცია
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI ძრავა</label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="bg-black/50 border-white/10 text-white focus:ring-purple-500/50">
                      <SelectValue placeholder="აირჩიე მოდელი" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121214] border-white/10 text-white">
                      <SelectItem value="claude">Claude 3.5 Sonnet (Logic)</SelectItem>
                      <SelectItem value="gemini">Gemini 2.5 Flash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">აგენტი (ECC)</label>
                  <Select value={agent} onValueChange={setAgent}>
                    <SelectTrigger className="bg-black/50 border-white/10 text-white focus:ring-purple-500/50">
                      <SelectValue placeholder="აირჩიე აგენტი" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121214] border-white/10 text-white">
                      <SelectItem value="architect">Frontend Architect</SelectItem>
                      <SelectItem value="performance">Performance Optimizer</SelectItem>
                      <SelectItem value="db-reviewer">Database Reviewer</SelectItem>
                      <SelectItem value="security">Security Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Card className="bg-[#121214]/80 border-white/5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  დავალების პარამეტრები
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  მიუთითე სამიზნე ფაილები და დეტალური ინსტრუქცია აგენტისთვის.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">GitHub Repository</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="https://github.com/owner/repo"
                      className="bg-black/50 border-white/10 text-white focus-visible:ring-emerald-500/50 flex-1"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                    />
                    <Input
                      placeholder="main"
                      className="bg-black/50 border-white/10 text-white focus-visible:ring-emerald-500/50 sm:w-28"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                    />
                  </div>
                </div>

                {/* === ფაილების ამომრჩევი ბლოკი === */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">სამიზნე ფაილები</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFetchFiles}
                      disabled={loadingFiles || loading}
                      className="bg-black/50 border-white/10 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/5"
                    >
                      {loadingFiles ? (
                        'იტვირთება...'
                      ) : (
                        <>
                          <FolderSearch className="w-3 h-3 mr-2" />
                          რეპოს სკანირება
                        </>
                      )}
                    </Button>
                  </div>

                  {repoFiles.length > 0 ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                          placeholder="მოძებნე ფაილი..."
                          className="pl-9 bg-black/40 border-white/10 text-sm text-zinc-300 focus-visible:ring-purple-500/50 h-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="h-48 overflow-y-auto rounded-md border border-white/10 bg-black/40 p-2 custom-scrollbar">
                        {filteredFiles.length > 0 ? (
                          filteredFiles.map((file) => (
                            <div
                              key={file}
                              onClick={() => toggleFile(file)}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors text-sm ${
                                selectedFiles.includes(file)
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'hover:bg-white/5 text-zinc-400 border border-transparent'
                              }`}
                            >
                              <FileCode className="w-4 h-4 opacity-50" />
                              <span className="truncate">{file}</span>
                              {selectedFiles.includes(file) && (
                                <CheckCircle2 className="w-4 h-4 ml-auto text-purple-400" />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-zinc-500 text-sm">
                            ფაილი &quot;{searchQuery}&quot; ვერ მოიძებნა
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-md bg-black/20 text-zinc-600 text-sm">
                      დააჭირეთ &quot;რეპოს სკანირებას&quot; ფაილების სანახავად
                    </div>
                  )}

                  {selectedFiles.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-emerald-400">მონიშნულია {selectedFiles.length} ფაილი</p>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        გასუფთავება
                      </button>
                    </div>
                  )}
                </div>
                {/* === დასასრული === */}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">ინსტრუქცია</label>
                  <Textarea
                    placeholder="აღწერე, რა უნდა გააკეთოს აგენტმა ამ ფაილებში..."
                    className="min-h-[150px] bg-black/50 border-white/10 text-white focus-visible:ring-emerald-500/50 resize-y"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                  />
                </div>

                {status.type === 'error' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {status.message}
                  </div>
                )}

                {status.type === 'success' && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-emerald-400 text-sm">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>აგენტმა წარმატებით დაასრულა მუშაობა!</span>
                    </div>
                    <a
                      href={status.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded hover:bg-emerald-500/30 transition-colors"
                    >
                      <GitPullRequest className="w-4 h-4" />
                      ნახე PR
                    </a>
                  </div>
                )}

                <Button
                  onClick={handleRunAgent}
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-zinc-200 transition-all font-semibold mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] h-12"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      აგენტი მუშაობს...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Play className="w-4 h-4 fill-black" />
                      აგენტის გაშვება (Deploy)
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
