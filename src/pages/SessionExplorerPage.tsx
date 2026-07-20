import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-enterprise";
import {
  type CellClassParams, type ColDef, type GridReadyEvent, type GridApi, type RowSelectedEvent, type RowDoubleClickedEvent,
} from "ag-grid-enterprise";
import { generateSessions } from "@/lib/mockData";
import type { LoginSession } from "@/types";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Download, FileSpreadsheet, Filter, Columns3, RefreshCw,
  ShieldCheck, ShieldAlert, ShieldX, TrendingUp, Eye,
} from "lucide-react";
import { formatNumber, formatTime } from "@/lib/utils";

const ROWS = generateSessions(200);

const DECISION_CELL = (params: CellClassParams) => {
  const v = params.value;
  if (v === "Allow") return "grid-cell-decision-allow";
  if (v === "Challenge") return "grid-cell-decision-challenge";
  if (v === "Deny") return "grid-cell-decision-deny";
  return "";
};

const ScoreCell = (params: { value: number }) => {
  const v = params.value;
  const color = v >= 75 ? "text-destructive" : v >= 40 ? "text-warning" : "text-success";
  return (
    <div className="flex h-full items-center gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${v >= 75 ? "bg-destructive" : v >= 40 ? "bg-warning" : "bg-success"}`} style={{ width: `${v}%` }} />
      </div>
      <span className={`text-[12px] font-semibold tabular-nums ${color}`}>{v}</span>
    </div>
  );
};

const DecisionCell = (params: { value: string }) => {
  const v = params.value;
  const cls = v === "Allow" ? "bg-success/15 text-success" : v === "Challenge" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive";
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-bold tracking-wide ${cls}`}>{v.toUpperCase()}</span>;
};

const StatusCell = (params: { value: string }) => {
  const v = params.value;
  const cls = v === "Success" ? "text-success" : v === "Failed" ? "text-warning" : "text-destructive";
  return <span className={`flex items-center gap-1.5 text-[12px] font-medium ${cls}`}><span className={`h-1.5 w-1.5 rounded-full ${v === "Success" ? "bg-success" : v === "Failed" ? "bg-warning" : "bg-destructive"}`} />{v}</span>;
};

const CountryCell = (params: { value: string; data: LoginSession }) => (
  <div className="flex h-full items-center gap-2">
    <span className="flex h-5 w-7 items-center justify-center rounded bg-muted font-mono text-[10px] font-bold text-muted-foreground">{params.data.countryCode}</span>
    <span className="text-[12px] text-foreground">{params.value}</span>
  </div>
);

const SessionIdCell = (params: { value: string }) => (
  <span className="font-mono text-[11.5px] font-semibold text-primary">{params.value}</span>
);

const DeviceCell = (params: { value: string; data: LoginSession }) => (
  <div className="flex h-full items-center gap-1.5">
    <span className="text-[12px] text-foreground">{params.value}</span>
    {params.data.newDevice && <span className="rounded bg-primary/15 px-1 text-[9px] font-bold text-primary">NEW</span>}
  </div>
);

export function SessionExplorerPage() {
  const navigate = useNavigate();
  const apiRef = useRef<GridApi | null>(null);
  const [quickFilter, setQuickFilter] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const columnDefs = useMemo<ColDef<LoginSession>[]>(() => [
    { headerName: "Session ID", field: "sessionId", cellRenderer: SessionIdCell, pinned: "left", width: 120 },
    { headerName: "Customer", field: "customer", width: 160, filter: "agTextColumnFilter" },
    { headerName: "Username", field: "username", width: 140, filter: "agTextColumnFilter" },
    { headerName: "Device", field: "device", cellRenderer: DeviceCell, width: 170, filter: "agSetColumnFilter" },
    { headerName: "Browser", field: "browser", width: 130, filter: "agSetColumnFilter" },
    { headerName: "Country", field: "country", cellRenderer: CountryCell, width: 150, filter: "agSetColumnFilter" },
    { headerName: "City", field: "city", width: 120, filter: "agTextColumnFilter" },
    {
      headerName: "Risk", field: "riskScore", cellRenderer: ScoreCell, width: 130,
      filter: "agNumberColumnFilter", sortable: true, sort: "desc", sortIndex: 1,
    },
    { headerName: "Coherence", field: "coherenceScore", cellRenderer: ScoreCell, width: 130, filter: "agNumberColumnFilter" },
    { headerName: "Fraud %", field: "fraudProbability", cellRenderer: ScoreCell, width: 120, filter: "agNumberColumnFilter" },
    { headerName: "Decision", field: "decision", cellRenderer: DecisionCell, cellClass: DECISION_CELL, width: 120, filter: "agSetColumnFilter", sortable: true, sortIndex: 0 },
    { headerName: "Application", field: "application", width: 150, filter: "agSetColumnFilter" },
    {
      headerName: "Login Time", field: "loginTime", width: 150, filter: "agDateColumnFilter", sortable: true,
      valueFormatter: (p) => new Date(p.value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
    },
    { headerName: "Duration", field: "duration", width: 110, filter: "agNumberColumnFilter", valueFormatter: (p) => formatTime(p.value) },
    { headerName: "Latency", field: "latency", width: 100, filter: "agNumberColumnFilter", valueFormatter: (p) => `${p.value}ms` },
    { headerName: "Channel", field: "channel", width: 120, filter: "agSetColumnFilter" },
    { headerName: "Status", field: "status", cellRenderer: StatusCell, width: 110, filter: "agSetColumnFilter" },
    { headerName: "IP", field: "ip", width: 120, filter: "agTextColumnFilter" },
    { headerName: "MFA", field: "mfaType", width: 130, filter: "agSetColumnFilter" },
    { headerName: "VPN", field: "vpn", width: 80, filter: "agSetColumnFilter", valueFormatter: (p) => (p.value ? "Yes" : "No") },
    { headerName: "Evidence", field: "evidenceCount", width: 90, filter: "agNumberColumnFilter" },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true, resizable: true, floatingFilter: true, minWidth: 80,
  }), []);

  const onGridReady = (e: GridReadyEvent) => {
    apiRef.current = e.api;
    e.api.setGridOption("rowData", ROWS);
  };

  const onRowSelected = (e: RowSelectedEvent) => {
    setSelectedCount(e.api.getSelectedRows().length);
  };

  const onRowDoubleClicked = (e: RowDoubleClickedEvent<LoginSession>) => {
    if (e.data) navigate(`/sessions/${e.data.sessionId}`);
  };

  const exportCsv = () => apiRef.current?.exportDataAsCsv({ fileName: "coherence-sessions.csv", onlySelected: selectedCount > 0 });
  const exportExcel = () => apiRef.current?.exportDataAsExcel({ fileName: "coherence-sessions.xlsx", onlySelected: selectedCount > 0 });
  const openColumns = () => apiRef.current?.openToolPanel("columns");
  const openFilters = () => apiRef.current?.openToolPanel("filters");

  const stats = useMemo(() => {
    const allow = ROWS.filter((r) => r.decision === "Allow").length;
    const challenge = ROWS.filter((r) => r.decision === "Challenge").length;
    const deny = ROWS.filter((r) => r.decision === "Deny").length;
    return { allow, challenge, deny, total: ROWS.length };
  }, []);

  return (
    <div className="flex h-full flex-col p-5 lg:p-6">
      <PageHeader
        title="Session Explorer"
        subtitle={`${formatNumber(stats.total)} login sessions · filterable, groupable, exportable`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => apiRef.current?.refreshInfiniteCache?.() ?? apiRef.current?.setGridOption("rowData", ROWS)}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
            <Button size="sm" onClick={() => selectedCount === 1 && navigate(`/sessions/${apiRef.current?.getSelectedRows()[0].sessionId}`)}>
              <Eye className="h-3.5 w-3.5" /> Investigate {selectedCount > 0 && `(${selectedCount})`}
            </Button>
          </>
        }
      />

      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass-card flex items-center gap-3 px-4 py-2.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</div><div className="text-base font-bold text-foreground">{formatNumber(stats.total)}</div></div>
        </div>
        <div className="glass-card flex items-center gap-3 px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-success" />
          <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Allow</div><div className="text-base font-bold text-success">{stats.allow}</div></div>
        </div>
        <div className="glass-card flex items-center gap-3 px-4 py-2.5">
          <ShieldAlert className="h-4 w-4 text-warning" />
          <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Challenge</div><div className="text-base font-bold text-warning">{stats.challenge}</div></div>
        </div>
        <div className="glass-card flex items-center gap-3 px-4 py-2.5">
          <ShieldX className="h-4 w-4 text-destructive" />
          <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Deny</div><div className="text-base font-bold text-destructive">{stats.deny}</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={quickFilter}
            onChange={(e) => { setQuickFilter(e.target.value); apiRef.current?.setGridOption("quickFilterText", e.target.value); }}
            placeholder="Quick search across all columns…"
            className="h-9 pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={openFilters}><Filter className="h-3.5 w-3.5" /> Filters</Button>
        <Button variant="outline" size="sm" onClick={openColumns}><Columns3 className="h-3.5 w-3.5" /> Columns</Button>
        {selectedCount > 0 && <Badge variant="default">{selectedCount} selected</Badge>}
      </div>

      {/* Grid */}
      <div className="ag-theme-coherence ag-theme-quartz glass-card flex-1 min-h-[520px] w-full overflow-hidden p-0">
        <AgGridReact<LoginSession>
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onRowSelected={onRowSelected}
          onRowDoubleClicked={onRowDoubleClicked}
          rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
          animateRows
          rowHeight={40}
          headerHeight={38}
          pagination
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
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
          excelStyles={[
            { id: "header", font: { bold: true } },
          ]}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Double-click any row to open Session Investigation</span>
        <span className="font-mono">{formatNumber(stats.total)} records · AG Grid Enterprise</span>
      </div>
    </div>
  );
}
