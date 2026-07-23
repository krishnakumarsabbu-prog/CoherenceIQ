import { useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-enterprise";
import {
  type ColDef, type GridReadyEvent, type GridApi, type RowDoubleClickedEvent,
} from "ag-grid-enterprise";
import { motion } from "framer-motion";
import { Upload, Download, FileSpreadsheet, Filter, Columns3, RefreshCw, Sparkles, Trash2, FileUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ruleIntelligenceApi, type RuleRecord } from "@/lib/ruleIntelligenceData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn, formatNumber } from "@/lib/utils";

const RISK_TONE: Record<string, "destructive" | "warning" | "default" | "muted"> = {
  Critical: "destructive",
  High: "warning",
  Medium: "default",
  Low: "muted",
};

const CLUSTER_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "muted"> = {
  "Device Intelligence": "default",
  "Network Intelligence": "secondary",
  "Location Intelligence": "success",
  "Credential Intelligence": "warning",
  "Behavior Intelligence": "default",
  "Customer Intelligence": "destructive",
  "Transaction Intelligence": "warning",
  "Temporal Intelligence": "muted",
  Unclustered: "muted",
};

function ConfidenceCell({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "text-success" : pct >= 50 ? "text-primary" : pct >= 25 ? "text-warning" : "text-destructive";
  const bar = pct >= 75 ? "bg-success" : pct >= 50 ? "bg-primary" : pct >= 25 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex h-full items-center gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-[12px] font-semibold tabular-nums", color)}>{pct}%</span>
    </div>
  );
}

function RiskCell({ value }: { value: string }) {
  const tone = RISK_TONE[value] ?? "muted";
  return <Badge variant={tone}>{value}</Badge>;
}

function ClusterCell({ value }: { value: string }) {
  const tone = CLUSTER_TONE[value] ?? "muted";
  return <Badge variant={tone} className="text-[9.5px]">{value}</Badge>;
}

function ParametersCell({ value }: { value: string[] }) {
  return (
    <div className="flex h-full flex-wrap items-center gap-1 py-1">
      {value.slice(0, 3).map((p) => (
        <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground">{p}</span>
      ))}
      {value.length > 3 && <span className="text-[9.5px] text-muted-foreground">+{value.length - 3}</span>}
    </div>
  );
}

interface Props {
  onRowSelect: (rule: RuleRecord) => void;
}

export function RuleCatalog({ onRowSelect }: Props) {
  const apiRef = useRef<GridApi | null>(null);
  const [quickFilter, setQuickFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadName, setUploadName] = useState("rules.md");
  const qc = useQueryClient();

  const { data: rules = [], isLoading, refetch } = useQuery({
    queryKey: ["ri-rules"],
    queryFn: ruleIntelligenceApi.getRules,
  });

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => ruleIntelligenceApi.uploadFiles(files),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ri"] }); setUploadOpen(false); },
  });

  const uploadTextMut = useMutation({
    mutationFn: ({ filename, content }: { filename: string; content: string }) =>
      ruleIntelligenceApi.uploadText(filename, content),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ri"] }); setUploadOpen(false); setUploadText(""); },
  });

  const clearMut = useMutation({
    mutationFn: ruleIntelligenceApi.clearRules,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ri"] }),
  });

  const seedMut = useMutation({
    mutationFn: ruleIntelligenceApi.seedRules,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ri"] }),
  });

  const columnDefs = useMemo<ColDef<RuleRecord>[]>(() => [
    { headerName: "Rule Name", field: "rule_name", pinned: "left", width: 280, filter: "agTextColumnFilter", cellRenderer: (p: { value: string }) => <span className="text-[12px] font-semibold text-foreground">{p.value}</span> },
    { headerName: "Primary Cluster", field: "primary_cluster", width: 180, filter: "agSetColumnFilter", cellRenderer: ClusterCell },
    { headerName: "Secondary Cluster", field: "secondary_cluster", width: 170, filter: "agSetColumnFilter", cellRenderer: (p: { value: string | null }) => p.value ? <Badge variant="outline" className="text-[9.5px]">{p.value}</Badge> : <span className="text-muted-foreground">—</span> },
    { headerName: "Risk Level", field: "risk_level", width: 120, filter: "agSetColumnFilter", cellRenderer: RiskCell },
    { headerName: "Param Count", field: "parameter_count", width: 110, filter: "agNumberColumnFilter", sortable: true },
    { headerName: "Parameters", field: "parameters", width: 260, filter: false, sortable: false, cellRenderer: ParametersCell },
    { headerName: "Confidence", field: "confidence", width: 130, filter: "agNumberColumnFilter", sortable: true, sort: "desc", cellRenderer: ConfidenceCell },
    { headerName: "Status", field: "status", width: 110, filter: "agSetColumnFilter", cellRenderer: (p: { value: string }) => <Badge variant="success">{p.value}</Badge> },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true, resizable: true, floatingFilter: true, minWidth: 80,
  }), []);

  const onGridReady = (e: GridReadyEvent) => { apiRef.current = e.api; e.api.setGridOption("rowData", rules); };

  const onRowDoubleClicked = (e: RowDoubleClickedEvent<RuleRecord>) => {
    if (e.data) onRowSelect(e.data);
  };

  const exportCsv = () => apiRef.current?.exportDataAsCsv({ fileName: "rule-intelligence.csv" });
  const exportExcel = () => apiRef.current?.exportDataAsExcel({ fileName: "rule-intelligence.xlsx" });
  const openColumns = () => apiRef.current?.openToolPanel("columns");
  const openFilters = () => apiRef.current?.openToolPanel("filters");

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadMut.mutate(files);
    e.target.value = "";
  };

  const stats = useMemo(() => ({
    total: rules.length,
    avgConf: rules.length ? Math.round((rules.reduce((s, r) => s + r.confidence, 0) / rules.length) * 100) : 0,
    clusters: new Set(rules.map((r) => r.primary_cluster)).size,
    critical: rules.filter((r) => r.risk_level === "Critical").length,
  }), [rules]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Rules", value: stats.total, color: "text-primary" },
          { label: "Avg Confidence", value: `${stats.avgConf}%`, color: "text-success" },
          { label: "Clusters", value: stats.clusters, color: "text-warning" },
          { label: "Critical", value: stats.critical, color: "text-destructive" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card flex items-center gap-3 px-4 py-2.5">
            <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div><div className={cn("text-base font-bold tabular-nums", s.color)}>{s.value}</div></div>
          </motion.div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={quickFilter} onChange={(e) => { setQuickFilter(e.target.value); apiRef.current?.setGridOption("quickFilterText", e.target.value); }} placeholder="Quick search across all columns…" className="h-9 pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={openFilters}><Filter className="h-3.5 w-3.5" /> Filters</Button>
        <Button variant="outline" size="sm" onClick={openColumns}><Columns3 className="h-3.5 w-3.5" /> Columns</Button>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> CSV</Button>
        <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
        <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="h-3.5 w-3.5" /> Upload</Button>
        <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} title="Load demo rules"><Sparkles className="h-3.5 w-3.5" /> Seed Demo</Button>
        <Button variant="outline" size="sm" onClick={() => clearMut.mutate()}><Trash2 className="h-3.5 w-3.5" /> Clear</Button>
      </div>

      <div className="ag-theme-coherence ag-theme-quartz glass-card flex-1 min-h-[440px] w-full overflow-hidden p-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">Loading rules…</div>
        ) : (
          <AgGridReact<RuleRecord>
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            onRowDoubleClicked={onRowDoubleClicked}
            animateRows
            rowHeight={40}
            headerHeight={38}
            pagination
            paginationPageSize={25}
            paginationPageSizeSelector={[10, 25, 50, 100]}
            sideBar={{
              toolPanels: [
                { id: "columns", labelDefault: "Columns", labelKey: "columns", iconKey: "columns", toolPanel: "agColumnsToolPanel" },
                { id: "filters", labelDefault: "Filters", labelKey: "filters", iconKey: "filter", toolPanel: "agFiltersToolPanel" },
              ],
              defaultToolPanel: "",
              hiddenByDefault: false,
            }}
            enableCharts
            cellSelection
            excelStyles={[{ id: "header", font: { bold: true } }]}
          />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Double-click any row to open Rule Details</span>
        <span className="font-mono">{formatNumber(stats.total)} records · AG Grid Enterprise</span>
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} className="max-w-2xl">
        <div className="p-5">
          <h3 className="text-base font-semibold text-foreground">Upload Rule Files</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">Upload Markdown files following the Rule Name / Rule Description / Parameter Count / Parameters structure.</p>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
            <FileUp className="h-6 w-6 text-primary" />
            <span className="text-[12px] font-medium text-foreground">Click to select one or more .md files</span>
            <span className="text-[10.5px] text-muted-foreground">They will be parsed and clustered automatically</span>
            <input type="file" multiple accept=".md,.markdown" className="hidden" onChange={onFilePicked} />
          </label>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or paste markdown</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="filename.md" className="mb-2 h-8 text-[12px]" />
          <textarea
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            placeholder={"Rule Name\nALERT_...\n\nRule Description\n...\n\nParameter Count\n3\n\nParameters\nParam A\nParam B\nParam C"}
            className="h-40 w-full resize-none rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] text-foreground outline-none focus:border-primary"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!uploadText.trim()} onClick={() => uploadTextMut.mutate({ filename: uploadName || "pasted.md", content: uploadText })}>
              <Upload className="h-3.5 w-3.5" /> Upload Text
            </Button>
          </div>
          {(uploadMut.isPending || uploadTextMut.isPending) && <p className="mt-2 text-[11px] text-primary">Uploading…</p>}
        </div>
      </Modal>
    </div>
  );
}
