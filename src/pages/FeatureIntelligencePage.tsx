import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Boxes, Workflow, Share2, Plus, Pencil, Trash2, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";
import { useProjectStore, useProjectFeatures, useProjectClusters } from "@/lib/useProjectStore";
import { projectStore, type EngineeredFeature } from "@/lib/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { BarChart } from "@/components/charts/Charts";
import { cn } from "@/lib/utils";

export function FeatureIntelligencePage() {
  useProjectStore();
  const features = useProjectFeatures();
  const clusters = useProjectClusters();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [editFeature, setEditFeature] = useState<EngineeredFeature | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!selectedDomain) return features;
    return features.filter((f) => f.domain === selectedDomain);
  }, [features, selectedDomain]);

  const domains = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of features) map.set(f.domain, (map.get(f.domain) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [features]);

  const importanceData = useMemo(() => ({
    categories: features.slice(0, 10).map((f) => f.feature_name.replace(/Score$/, "")),
    series: [{ name: "Importance", data: features.slice(0, 10).map((f) => Math.round(f.importance * 100)) }],
  }), [features]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-5 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Feature Intelligence</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {features.length} engineered features · {clusters.length} source clusters · drag-and-drop feature engineering
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Custom Feature
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Domain sidebar */}
        <div className="w-[220px] shrink-0 overflow-y-auto border-r border-border p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Domains</div>
          <button
            onClick={() => setSelectedDomain(null)}
            className={cn(
              "mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors",
              !selectedDomain ? "bg-primary/15 text-primary" : "text-foreground hover:bg-accent/40",
            )}
          >
            <span>All Features</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] tabular-nums">{features.length}</span>
          </button>
          {domains.map(([name, count]) => {
            const cluster = clusters.find((c) => c.name === name);
            return (
              <button
                key={name}
                onClick={() => setSelectedDomain(name)}
                className={cn(
                  "mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors",
                  selectedDomain === name ? "bg-primary/15 text-primary" : "text-foreground hover:bg-accent/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: cluster?.color ?? "#64748b" }} />
                  <span className="truncate">{name.split(" ")[0]}</span>
                </div>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-5 lg:p-6">
          {/* Feature graph + importance */}
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-[13px] font-bold text-foreground">Feature Importance</h3>
              </div>
              <BarChart data={importanceData} height={240} />
            </div>
            <div className="glass-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <h3 className="text-[13px] font-bold text-foreground">Feature Graph</h3>
              </div>
              <div className="flex h-[240px] flex-wrap items-center justify-center gap-2 overflow-auto">
                {features.slice(0, 16).map((f) => {
                  const cluster = clusters.find((c) => c.name === f.domain);
                  return (
                    <div
                      key={f.feature_name}
                      className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5"
                      style={{ borderLeft: `3px solid ${cluster?.color ?? "#64748b"}` }}
                    >
                      <span className="text-[10.5px] font-semibold text-foreground">{f.feature_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((f, i) => {
              const cluster = clusters.find((c) => c.name === f.domain);
              return (
                <motion.div
                  key={f.feature_name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="glass-card glass-card-hover group p-4"
                  style={{ borderLeft: `3px solid ${cluster?.color ?? "#64748b"}` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[13px] font-bold text-foreground">{f.feature_name}</h3>
                      <Badge variant="default" className="mt-1 text-[9px]">{f.domain}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditFeature(f); setEditOpen(true); }}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => projectStore.deleteFeature(f.feature_name)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{f.description}</p>
                  <div className="mt-2 rounded-md bg-card/40 px-2 py-1 font-mono text-[9.5px] text-primary">{f.formula}</div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {f.derived_parameters.slice(0, 5).map((p) => (
                      <span key={p} className="rounded bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-medium text-primary">{p}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {f.derived_rules.length} rules</span>
                      <span className="flex items-center gap-1"><Workflow className="h-3 w-3" /> {f.used_by.length} pipelines</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Importance</span>
                      <span className="text-[13px] font-bold tabular-nums text-primary">{(f.importance * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Boxes className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-[13px]">No features yet for this domain.</p>
                <p className="mt-1 text-[11px]">Upload rules in Rule Intelligence to auto-generate features.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <EditFeatureModal
        feature={editFeature}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={(patch) => {
          if (editFeature) projectStore.updateFeature(editFeature.feature_name, patch);
          setEditOpen(false);
        }}
      />

      {/* Create modal */}
      <CreateFeatureModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        domains={clusters.map((c) => c.name)}
        onCreate={(f) => {
          projectStore.createFeature(f);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function EditFeatureModal({ feature, open, onClose, onSave }: {
  feature: EngineeredFeature | null;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<EngineeredFeature>) => void;
}) {
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [formula, setFormula] = useState("");

  useMemo(() => {
    if (feature) {
      setDescription(feature.description);
      setWeight(String(feature.weight));
      setFormula(feature.formula);
    }
  }, [feature]);

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="border-b border-border px-5 py-4 text-[14px] font-bold text-foreground">Edit Feature</div>
      {feature && (
        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Name</label>
            <Input value={feature.feature_name} disabled className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[12px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Formula</label>
            <Input value={formula} onChange={(e) => setFormula(e.target.value)} className="h-9 font-mono text-[12px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Weight (0-1)</label>
            <Input value={weight} onChange={(e) => setWeight(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => onSave({ description, formula, weight: parseFloat(weight) || 0 })}>Save</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CreateFeatureModal({ open, onClose, domains, onCreate }: {
  open: boolean;
  onClose: () => void;
  domains: string[];
  onCreate: (f: EngineeredFeature) => void;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState(domains[0] ?? "");
  const [description, setDescription] = useState("");
  const [formula, setFormula] = useState("");

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="border-b border-border px-5 py-4 text-[14px] font-bold text-foreground">Create Custom Feature</div>
      <div className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Feature Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CustomRiskScore" className="h-9 text-[13px]" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Domain</label>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
          >
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this feature measures..."
            className="h-20 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[12px] text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Formula</label>
          <Input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="weighted(param_a, param_b)" className="h-9 font-mono text-[12px]" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => {
              if (!name.trim()) return;
              onCreate({
                feature_name: name.trim(),
                domain,
                derived_rules: [],
                derived_parameters: [],
                weight: 0.1,
                description: description || "Custom engineered feature.",
                used_by: [],
                importance: 0.5,
                formula: formula || "custom",
              });
              setName(""); setDescription(""); setFormula("");
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
