import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, ShieldCheck, KeyRound, Flag, ScrollText, FileKey, Settings2, Search, Plus, MoveHorizontal as MoreHorizontal, Check, X, Clock, Copy, Eye, EyeOff, RotateCw, Trash2, ChevronRight, Lock, UserCog, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from "lucide-react";
import {
  ADMIN_USERS, ROLES, PERMISSIONS, FEATURE_FLAGS, API_KEYS, SECRETS, AUDIT_LOGS,
  type AdminUser, type FeatureFlag,
} from "@/lib/ruleStudioData";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Popover, DropdownItem, DropdownSeparator, DropdownLabel } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./RuleStudioTabs";

type Section = "users" | "roles" | "permissions" | "flags" | "keys" | "secrets" | "audit" | "settings";

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "permissions", label: "Permissions", icon: Lock },
  { id: "flags", label: "Feature Flags", icon: Flag },
  { id: "keys", label: "API Keys", icon: KeyRound },
  { id: "secrets", label: "Secrets", icon: FileKey },
  { id: "audit", label: "Audit Logs", icon: ScrollText },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export function Administration() {
  const [section, setSection] = useState<Section>("users");
  return (
    <div>
      <PageHeader title="Administration" subtitle="Tenant, identity, and policy management for Global Bank · Production" actions={<Button size="sm"><Plus className="h-3.5 w-3.5" /> New user</Button>} />
      <Tabs value={section} onValueChange={(v) => setSection(v as Section)}>
        <div className="border-b border-border pb-2">
          <TabsList>
            {SECTIONS.map((s) => <TabsTrigger key={s.id} value={s.id}><s.icon className="h-3.5 w-3.5" /> {s.label}</TabsTrigger>)}
          </TabsList>
        </div>

        <TabsContent value="users"><UsersSection /></TabsContent>
        <TabsContent value="roles"><RolesSection /></TabsContent>
        <TabsContent value="permissions"><PermissionsSection /></TabsContent>
        <TabsContent value="flags"><FlagsSection /></TabsContent>
        <TabsContent value="keys"><ApiKeysSection /></TabsContent>
        <TabsContent value="secrets"><SecretsSection /></TabsContent>
        <TabsContent value="audit"><AuditSection /></TabsContent>
        <TabsContent value="settings"><SettingsSection /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersSection() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const users = ADMIN_USERS;
  const roles = ["All", ...Array.from(new Set(users.map((u) => u.role)))];
  const filtered = users.filter((u) => (roleFilter === "All" || u.role === roleFilter) && (u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || u.team.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-3 pt-3">
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search users…" />
        <div className="flex flex-wrap items-center gap-1">
          {roles.map((r) => <FilterChip key={r} active={roleFilter === r} onClick={() => setRoleFilter(r)}>{r}</FilterChip>)}
        </div>
        <Button variant="outline" size="sm" className="ml-auto"><Plus className="h-3.5 w-3.5" /> Invite user</Button>
      </Toolbar>
      <DataTable columns={["User", "Role", "Team", "Status", "MFA", "Last login", ""]} rows={filtered.map((u) => ({
        id: u.id,
        cells: [
          <UserCell key="u" user={u} />,
          <Badge key="r" variant="muted">{u.role}</Badge>,
          <span key="t" className="text-[12.5px] text-muted-foreground">{u.team}</span>,
          <StatusBadge key="s" status={u.status} />,
          u.mfa ? <Badge key="m" variant="success"><Check className="h-3 w-3" /> On</Badge> : <Badge key="m" variant="warning"><X className="h-3 w-3" /> Off</Badge>,
          <span key="l" className="text-[12px] text-muted-foreground">{u.lastLogin === "—" ? "—" : relativeTime(u.lastLogin)}</span>,
          <RowMenu key="a" items={["Edit profile", "Reset password", "Manage roles", "Suspend user", "Remove user"]} />,
        ],
      }))} />
    </div>
  );
}

function RolesSection() {
  const [selected, setSelected] = useState(ROLES[0].id);
  const role = ROLES.find((r) => r.id === selected)!;
  return (
    <div className="grid gap-3 pt-3 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full border-dashed"><Plus className="h-3.5 w-3.5" /> Create role</Button>
        {ROLES.map((r, i) => (
          <motion.button key={r.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelected(r.id)} className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all", selected === r.id ? "border-primary/50 bg-primary/10" : "border-border bg-background/40 hover:border-primary/30")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary"><ShieldCheck className="h-4 w-4" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-foreground">{r.name}</span>
                {r.system && <Badge variant="muted" className="text-[9px]">SYSTEM</Badge>}
              </div>
              <div className="text-[11px] text-muted-foreground">{r.members} members · {r.permissions} permissions</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        ))}
      </div>
      <div className="space-y-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-foreground">{role.name}</h3>
                <p className="text-[12.5px] text-muted-foreground">{role.description}</p>
              </div>
              <Badge variant="muted">{role.members} members</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat label="Members" value={role.members} />
              <Stat label="Permissions" value={role.permissions} />
              <Stat label="Type" value={role.system ? "System" : "Custom"} />
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
              <Button size="sm"><UserCog className="h-3.5 w-3.5" /> Assign members</Button>
              <Button variant="outline" size="sm">Edit permissions</Button>
              {!role.system && <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned members</div>
            <div className="space-y-1.5">
              {ADMIN_USERS.filter(() => Math.random() < 0.5).slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-[10px] font-bold text-white">{u.name.split(" ").map((n) => n[0]).join("")}</span>
                  <div className="flex-1"><div className="text-[12.5px] font-medium text-foreground">{u.name}</div><div className="text-[10.5px] text-muted-foreground">{u.email}</div></div>
                  <Badge variant={u.status === "Active" ? "success" : "muted"}>{u.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PermissionsSection() {
  const byCat = useMemo(() => {
    const m = new Map<string, typeof PERMISSIONS>();
    PERMISSIONS.forEach((p) => { const a = m.get(p.category) ?? []; a.push(p); m.set(p.category, a); });
    return [...m.entries()];
  }, []);
  return (
    <div className="space-y-3 pt-3">
      <Toolbar>
        <div className="text-[12.5px] text-muted-foreground">{PERMISSIONS.length} permissions across {byCat.length} categories</div>
        <Button variant="outline" size="sm" className="ml-auto"><Plus className="h-3.5 w-3.5" /> Custom permission</Button>
      </Toolbar>
      <div className="grid gap-3 md:grid-cols-2">
        {byCat.map(([cat, perms], i) => (
          <motion.div key={cat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card><CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">{cat}</span>
                <Badge variant="muted">{perms.length}</Badge>
              </div>
              <div className="space-y-1">
                {perms.map((p) => (
                  <div key={p.key} className="flex items-center gap-2 rounded-md border border-border/50 bg-background/30 px-2.5 py-1.5">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <div className="flex-1"><div className="text-[12px] font-medium text-foreground">{p.label}</div><div className="font-mono text-[10px] text-muted-foreground">{p.key}</div></div>
                    <span className="h-4 w-8 rounded-full bg-success/20" title="Granted to Risk Officer" />
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FlagsSection() {
  const [flags, setFlags] = useState<FeatureFlag[]>(FEATURE_FLAGS);
  const toggle = (id: string) => setFlags((prev) => prev.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f));
  return (
    <div className="space-y-3 pt-3">
      <Toolbar>
        <div className="text-[12.5px] text-muted-foreground">{flags.filter((f) => f.enabled).length} of {flags.length} enabled</div>
        <Button variant="outline" size="sm" className="ml-auto"><Plus className="h-3.5 w-3.5" /> New flag</Button>
      </Toolbar>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_120px_120px_140px_120px_60px] bg-muted/30 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Flag</span><span>Environment</span><span>State</span><span>Owner</span><span>Updated</span><span></span>
        </div>
        {flags.map((f, i) => (
          <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="grid grid-cols-[1fr_120px_120px_140px_120px_60px] items-center border-t border-border/60 px-4 py-2.5">
            <div>
              <div className="text-[12.5px] font-medium text-foreground">{f.name}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground">{f.key}</div>
            </div>
            <Badge variant={f.environment === "Production" ? "success" : f.environment === "Staging" ? "warning" : "muted"}>{f.environment}</Badge>
            <button onClick={() => toggle(f.id)} className={cn("relative h-5 w-9 rounded-full transition-colors", f.enabled ? "bg-primary" : "bg-muted")}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", f.enabled ? "left-[18px]" : "left-0.5")} />
            </button>
            <span className="text-[12px] text-muted-foreground">{f.owner}</span>
            <span className="text-[12px] text-muted-foreground">{f.updated}</span>
            <RowMenu items={["Edit", "Clone", "Archive"]} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ApiKeysSection() {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-3 pt-3">
      <Toolbar>
        <div className="text-[12.5px] text-muted-foreground">{API_KEYS.filter((k) => k.status === "Active").length} active keys</div>
        <Button size="sm" className="ml-auto"><Plus className="h-3.5 w-3.5" /> Generate key</Button>
      </Toolbar>
      <div className="space-y-2">
        {API_KEYS.map((k, i) => (
          <motion.div key={k.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><KeyRound className="h-4 w-4" /></div>
            <div className="min-w-[180px] flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">{k.name}</span>
                <Badge variant={k.status === "Active" ? "success" : "destructive"}>{k.status}</Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span>{reveal[k.id] ? `${k.prefix}_sk_live_9f2a8c4e…` : `${k.prefix}••••••••••••••`}</span>
                <button onClick={() => setReveal((r) => ({ ...r, [k.id]: !r[k.id] }))} className="rounded p-0.5 hover:bg-accent">{reveal[k.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</button>
                <button className="rounded p-0.5 hover:bg-accent"><Copy className="h-3 w-3" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">{k.scopes.map((s) => <Badge key={s} variant="muted" className="font-mono text-[9.5px]">{s}</Badge>)}</div>
            <div className="text-right text-[11px] text-muted-foreground">
              <div>Created {k.created}</div>
              <div>Last used {relativeTime(k.lastUsed)}</div>
            </div>
            <RowMenu items={k.status === "Active" ? ["Rotate", "Edit scopes", "Revoke"] : ["View", "Delete"]} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SecretsSection() {
  return (
    <div className="space-y-3 pt-3">
      <Toolbar>
        <div className="text-[12.5px] text-muted-foreground">{SECRETS.length} secrets · encrypted at rest (AES-256-GCM)</div>
        <Button size="sm" className="ml-auto"><Plus className="h-3.5 w-3.5" /> New secret</Button>
      </Toolbar>
      <div className="grid gap-3 md:grid-cols-2">
        {SECRETS.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card><CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><FileKey className="h-4 w-4" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12.5px] font-semibold text-foreground">{s.name}</span>
                    <Badge variant="muted" className="text-[9.5px]">{s.type}</Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Owner {s.owner} · updated {s.updated}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-[11.5px] text-muted-foreground">Rotates in {s.rotatedIn}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-7"><RotateCw className="h-3 w-3" /> Rotate</Button>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AuditSection() {
  const [q, setQ] = useState("");
  const filtered = AUDIT_LOGS.filter((a) => a.actor.toLowerCase().includes(q.toLowerCase()) || a.action.toLowerCase().includes(q.toLowerCase()) || a.target.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3 pt-3">
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search audit entries…" />
        <Button variant="outline" size="sm" className="ml-auto"><ScrollText className="h-3.5 w-3.5" /> Export CSV</Button>
      </Toolbar>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1.5fr_1.2fr_1.5fr_120px_160px_80px] bg-muted/30 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Actor</span><span>Action</span><span>Target</span><span>IP</span><span>Time</span><span>Result</span>
        </div>
        {filtered.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="grid grid-cols-[1.5fr_1.2fr_1.5fr_120px_160px_80px] items-center border-t border-border/60 px-4 py-2 text-[12px]">
            <span className="font-mono text-foreground">{a.actor}</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">{a.action}</span>
            <span className="text-muted-foreground">{a.target}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{a.ip}</span>
            <span className="text-muted-foreground">{formatDateTime(a.ts)}</span>
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", a.result === "Success" ? "text-success" : "text-destructive")}>
              {a.result === "Success" ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />} {a.result}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="grid gap-3 pt-3 lg:grid-cols-2">
      <FormCard title="Tenant Profile" description="Organization identity and branding.">
        <FormField label="Organization" value="Global Bank N.A." />
        <FormField label="Tenant ID" value="tenant_gb_prod_001" mono />
        <FormField label="Region" value="eu-central-1" />
        <FormField label="Primary contact" value="security@globalbank.com" />
      </FormCard>
      <FormCard title="Session Policy" description="Tenant-wide session defaults.">
        <FormField label="Default session timeout (min)" value="30" />
        <FormField label="Max concurrent sessions" value="3" />
        <FormField label="Idle timeout (min)" value="15" />
        <ToggleRow label="Require MFA for all admins" defaultOn />
        <ToggleRow label="IP allowlist enforcement" defaultOn />
      </FormCard>
      <FormCard title="Retention" description="Data retention and archival windows.">
        <FormField label="Session retention (days)" value="365" />
        <FormField label="Evidence retention (days)" value="2555" />
        <FormField label="Audit log retention (days)" value="2555" />
        <ToggleRow label="Auto-archive closed cases" defaultOn />
      </FormCard>
      <FormCard title="Notifications" description="Alert routing and escalation.">
        <FormField label="Security alerts channel" value="#secops-alerts" />
        <FormField label="Approval queue channel" value="#risk-approvals" />
        <FormField label="Escalation email" value="risk-escalation@globalbank.com" />
        <ToggleRow label="Page on-call for Critical rules" defaultOn />
      </FormCard>
      <FormCard title="Compliance" description="Regulatory frameworks and reporting.">
        <ToggleRow label="SOC 2 evidence collection" defaultOn />
        <ToggleRow label="ISO 27001 controls mapping" defaultOn />
        <ToggleRow label="PCI DSS mode" />
        <FormField label="Report cadence" value="Monthly" />
      </FormCard>
      <FormCard title="Integrations" description="External system connections.">
        <FormField label="SIEM (Splunk)" value="https://splunk.globalbank.com:8088" mono />
        <FormField label="SOAR (Phantom)" value="connected" />
        <FormField label="ITSM (ServiceNow)" value="https://globalbank.service-now.com" mono />
        <ToggleRow label="Stream audit events to SIEM" defaultOn />
      </FormCard>
    </div>
  );
}

/* ---- shared bits ---- */

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-[220px]">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 pl-9" />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors", active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{children}</button>;
}

function UserCell({ user }: { user: AdminUser }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-[10px] font-bold text-white">{user.name.split(" ").map((n) => n[0]).join("")}</span>
      <div>
        <div className="text-[12.5px] font-medium text-foreground">{user.name}</div>
        <div className="text-[10.5px] text-muted-foreground">{user.email}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminUser["status"] }) {
  const v = status === "Active" ? "success" : status === "Suspended" ? "destructive" : "warning";
  return <Badge variant={v as "success"}>{status}</Badge>;
}

function RowMenu({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <Popover open={open} onOpenChange={setOpen} align="end" contentClassName="min-w-[180px]" trigger={<Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>}>
        {open && (
          <>
            <DropdownLabel>Actions</DropdownLabel>
            <DropdownSeparator />
            {items.map((it) => (
              <DropdownItem key={it} onClick={() => setOpen(false)} className={cn(it.toLowerCase().includes("suspend") || it.toLowerCase().includes("revoke") || it.toLowerCase().includes("remove") || it.toLowerCase().includes("delete") ? "text-destructive hover:text-destructive" : "")}>
                {it}
              </DropdownItem>
            ))}
          </>
        )}
      </Popover>
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: { id: string; cells: React.ReactNode[] }[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid bg-muted/30 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((c) => <span key={c}>{c}</span>)}
      </div>
      {rows.map((r, i) => (
        <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="grid items-center border-t border-border/60 px-4 py-2.5" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {r.cells.map((c, j) => <div key={j}>{c}</div>)}
        </motion.div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-border bg-background/40 p-3 text-center"><div className="text-[18px] font-bold text-foreground">{value}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div></div>;
}

function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3"><h3 className="text-[14px] font-semibold text-foreground">{title}</h3><p className="text-[12px] text-muted-foreground">{description}</p></div>
        <div className="space-y-3">{children}</div>
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm">Reset</Button>
          <Button size="sm"><CheckCircle2 className="h-3.5 w-3.5" /> Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input defaultValue={value} className={cn("mt-1 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30", mono && "font-mono")} />
    </label>
  );
}

function ToggleRow({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <label className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <span className="text-[12.5px] text-foreground">{label}</span>
      <button type="button" onClick={() => setOn(!on)} className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}
