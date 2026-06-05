import { cn } from '@/lib/utils';

type GlassCardProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  accent?: 'purple' | 'emerald' | 'blue';
  className?: string;
  children: React.ReactNode;
};

const accentStyles = {
  purple: 'shadow-[0_0_20px_rgba(168,85,247,0.08)] hover:border-purple-500/20',
  emerald: 'shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/20',
  blue: 'shadow-[0_0_20px_rgba(59,130,246,0.08)] hover:border-blue-500/20',
};

export function GlassCard({
  title,
  description,
  icon,
  accent = 'purple',
  className,
  children,
}: GlassCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-white/10 bg-[#121214]/75 backdrop-blur-md transition-all duration-300',
        accentStyles[accent],
        className
      )}
    >
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
        </div>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}
