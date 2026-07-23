"use client";

import { RotateCcw, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { WorkspacePageShell } from "@/components/layout/workspace-page-shell";
import { useApp } from "@/hooks/use-app";

export function SettingsPage() {
  const {
    modelRoutingPreferences,
    setSmartRouting,
    setRoutingPriority,
    mockSpending,
    mockSpendStatus,
    setMockMonthlyCap,
    resetMockSpending,
    isLiveMode,
  } = useApp();

  return (
    <WorkspacePageShell title="Settings" description="Simple local controls for how the workspace recommends and spends.">
      <div className="space-y-5">
        <Section icon={<Sparkles className="size-4" />} title="AI preferences" description="Recommendations are local; you always choose the final model.">
          <Toggle label="Smart model routing" checked={modelRoutingPreferences.smartRouting} onChange={setSmartRouting} />
          <label className="mt-4 block text-sm text-[var(--text-primary)]"><span className="mb-1.5 block text-xs text-[var(--text-secondary)]">Optimize recommendations for</span><select value={modelRoutingPreferences.priority} onChange={(event) => setRoutingPriority(event.target.value as typeof modelRoutingPreferences.priority)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"><option value="speed">Speed</option><option value="balanced">Balanced</option><option value="quality">Quality</option><option value="cost">Cost</option></select></label>
        </Section>

        <Section icon={<Wallet className="size-4" />} title="Mock spending" description={isLiveMode ? "Live mode is enforced by AgentGuard; mock controls are unavailable." : "Local simulation only. It is not provider billing."}>
          {isLiveMode ? <p className="text-sm text-[var(--text-secondary)]">AgentGuard is the authoritative live budget guard.</p> : <><div className="flex items-end gap-3"><label className="flex-1"><span className="mb-1.5 block text-xs text-[var(--text-secondary)]">Monthly cap (USD)</span><input type="number" min="0.01" step="0.01" value={mockSpending.monthlyCapUsd} onChange={(event) => setMockMonthlyCap(Number(event.target.value))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" /></label><button type="button" onClick={resetMockSpending} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"><RotateCcw className="size-3.5" /> Reset</button></div><div className="mt-4"><div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>${mockSpending.spentUsd.toFixed(2)} used</span><span>{mockSpendStatus.percentUsed}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--bg-hover)]"><div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${mockSpendStatus.percentUsed}%` }} /></div></div></>}
        </Section>

        <Section icon={<ShieldCheck className="size-4" />} title="Privacy & connections" description="Credentials and provider connections are intentionally not stored in browser settings.">
          <p className="text-sm text-[var(--text-secondary)]">GitHub, VS Code and model API connections will appear here after secure OAuth and extension support are implemented.</p>
        </Section>
      </div>
    </WorkspacePageShell>
  );
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5"><div className="flex items-center gap-2 text-[var(--text-primary)]"><span className="text-[var(--accent)]">{icon}</span><h2 className="text-sm font-semibold">{title}</h2></div><p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p><div className="mt-4">{children}</div></section>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-[var(--text-primary)]"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[var(--accent)]" /></label>;
}
