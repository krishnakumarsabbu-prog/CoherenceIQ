import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, GripVertical, CornerDownRight, ChevronRight, Copy,
  Variable as VarIcon, Zap, ShieldCheck, ShieldAlert, ShieldX, ShieldMinus, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  type TreeNode, type GroupNode, type ConditionNode, type LogicalOp,
  type ConditionOp, type RuleAction, type ActionKind, type RiskRule,
  VARIABLES, OPERATORS, ACTIONS, uid,
} from "@/lib/ruleStudioData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, DropdownItem, DropdownSeparator, DropdownLabel } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const ACTION_ICON: Record<ActionKind, React.ElementType> = {
  "Risk Increase": ArrowUp,
  "Risk Reduction": ArrowDown,
  "Challenge": ShieldAlert,
  "Allow": ShieldCheck,
  "Block": ShieldX,
};
const ACTION_TONE: Record<ActionKind, string> = {
  "Risk Increase": "bg-warning/15 text-warning border-warning/30",
  "Risk Reduction": "bg-primary/15 text-primary border-primary/30",
  "Challenge": "bg-warning/15 text-warning border-warning/30",
  "Allow": "bg-success/15 text-success border-success/30",
  "Block": "bg-destructive/15 text-destructive border-destructive/30",
};

function isGroup(n?: TreeNode | null): n is GroupNode { return Boolean(n && typeof n === "object" && "op" in n); }

interface DragState {
  id: string;
  parentId: string | null;
  index: number;
}

interface BuilderProps {
  rule: RiskRule;
  onChange: (rule: RiskRule) => void;
}

export function RuleBuilder({ rule, onChange }: BuilderProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selected, setSelected] = useState<string | null>(rule?.root?.id ?? null);

  const updateRoot = (next: GroupNode) => onChange({ ...rule, root: next });

  const mutateNode = (parentId: string | null, nodeId: string, mutator: (n: TreeNode) => TreeNode | null): GroupNode => {
    const visit = (node: TreeNode): TreeNode | null => {
      if (node.id === nodeId) return mutator(node);
      if (isGroup(node)) {
        const kids = (node.children ?? []).map(visit).filter((x): x is TreeNode => x !== null);
        return { ...node, children: kids };
      }
      return node;
    };
    const root = visit(rule.root);
    return (root && isGroup(root)) ? root : rule.root;
  };

  const findParent = (id: string, node: TreeNode = rule.root, parent: GroupNode | null = null): GroupNode | null => {
    if (node.id === id) return parent;
    if (isGroup(node)) {
      for (const c of (node.children ?? [])) {
        const r = findParent(id, c, node);
        if (r) return r;
      }
    }
    return null;
  };

  const addCondition = (parentId: string) => {
    const newCond: ConditionNode = { id: uid("c"), variable: "session.riskScore", op: "greater_than", value: "50", plugin: "Coherence Brain" };
    updateRoot(mutateNode(null, parentId, (n) => isGroup(n) ? { ...n, children: [...(n.children ?? []), newCond] } : n));
  };
  const addGroup = (parentId: string, op: LogicalOp = "AND") => {
    const newGroup: GroupNode = { id: uid("g"), op, negated: false, children: [] };
    updateRoot(mutateNode(null, parentId, (n) => isGroup(n) ? { ...n, children: [...(n.children ?? []), newGroup] } : n));
  };
  const removeNode = (id: string) => {
    const parent = findParent(id);
    if (!parent) return;
    updateRoot(mutateNode(null, parent.id, (n) => isGroup(n) ? { ...n, children: (n.children ?? []).filter((c) => c.id !== id) } : n));
  };
  const duplicateNode = (id: string) => {
    const clone = (n: TreeNode): TreeNode => isGroup(n) ? { ...n, id: uid("g"), children: (n.children ?? []).map(clone) } : { ...n, id: uid("c") };
    const parent = findParent(id);
    if (!parent) return;
    const target = (parent.children ?? []).find((c) => c.id === id);
    if (!target) return;
    const cp = clone(target);
    updateRoot(mutateNode(null, parent.id, (n) => isGroup(n) ? { ...n, children: [...(n.children ?? []), cp] } : n));
  };
  const updateNode = (id: string, patch: Partial<ConditionNode> | Partial<GroupNode>) => {
    updateRoot(mutateNode(null, id, (n) => ({ ...n, ...patch } as TreeNode)));
  };

  const moveNode = (id: string, dir: -1 | 1) => {
    const parent = findParent(id);
    if (!parent) return;
    const pKids = parent.children ?? [];
    const idx = pKids.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= pKids.length) return;
    const kids = [...pKids];
    [kids[idx], kids[target]] = [kids[target], kids[idx]];
    updateRoot(mutateNode(null, parent.id, (n) => isGroup(n) ? { ...n, children: kids } : n));
  };

  const reorderInto = (dragId: string, targetParentId: string, targetIndex: number) => {
    const srcParent = findParent(dragId);
    if (!srcParent) return;
    const sKids = srcParent.children ?? [];
    const node = sKids.find((c) => c.id === dragId);
    if (!node) return;
    if (dragId === targetParentId) return;
    // Prevent dropping a group into itself
    let p: GroupNode | null = findParent(targetParentId);
    while (p) { if (p.id === dragId) return; p = findParent(p.id); }
    const srcKids = sKids.filter((c) => c.id !== dragId);
    let root: TreeNode = mutateNode(null, srcParent.id, (n) => isGroup(n) ? { ...n, children: srcKids } : n);
    const tgtParent = findIn(root, targetParentId);
    if (!tgtParent || !isGroup(tgtParent)) return;
    const newKids = [...(tgtParent.children ?? [])];
    newKids.splice(Math.min(targetIndex, newKids.length), 0, node);
    root = mutateIn(root, targetParentId, (n) => isGroup(n) ? { ...n, children: newKids } : n);
    onChange({ ...rule, root: (root && isGroup(root)) ? root : rule.root });
  };

  const addAction = (kind: ActionKind) => {
    const a: RuleAction = { id: uid("a"), kind, amount: kind.includes("Risk") ? 10 : undefined, reason: "" };
    onChange({ ...rule, actions: [...rule.actions, a] });
  };
  const updateAction = (id: string, patch: Partial<RuleAction>) => {
    onChange({ ...rule, actions: rule.actions.map((a) => a.id === id ? { ...a, ...patch } : a) });
  };
  const removeAction = (id: string) => onChange({ ...rule, actions: rule.actions.filter((a) => a.id !== id) });

  const actions = rule.actions;

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_300px]">
      <PalettePanel onAddCondition={() => addCondition(rule.root.id)} onAddGroup={(op) => addGroup(rule.root.id, op)} />
      <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rule Canvas · IF</div>
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="font-mono">{countNodes(rule.root)} nodes</Badge>
            <Badge variant="muted" className="font-mono">{actions.length} actions</Badge>
          </div>
        </div>
        <div className="scrollbar-thin flex-1 overflow-auto rounded-xl border border-border bg-background/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md bg-primary/15 px-2.5 py-1 text-[12px] font-bold tracking-wider text-primary">IF</span>
            <span className="text-[12px] text-muted-foreground">— the following is true:</span>
          </div>
          <TreeView
            node={rule.root}
            depth={0}
            selected={selected}
            onSelect={setSelected}
            drag={drag}
            setDrag={setDrag}
            onReorder={reorderInto}
            onRemove={removeNode}
            onDuplicate={duplicateNode}
            onMove={moveNode}
            onAddCondition={addCondition}
            onAddGroup={addGroup}
            onUpdateNode={updateNode}
            rootId={rule.root.id}
          />
          <div className="mt-4 border-t border-border pt-3">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">THEN — execute actions</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {actions.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", ACTION_TONE[a.kind])}
                  >
                    {(() => { const Icon = ACTION_ICON[a.kind]; return <Icon className="h-4 w-4 shrink-0" /> })()}
                    <span className="text-[12.5px] font-semibold">{a.kind}</span>
                    {(a.kind === "Risk Increase" || a.kind === "Risk Reduction") && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] opacity-70">by</span>
                        <input
                          type="number"
                          value={a.amount ?? 0}
                          onChange={(e) => updateAction(a.id, { amount: +e.target.value })}
                          className="w-14 rounded border border-current/30 bg-transparent px-1.5 py-0.5 text-[12px] font-mono"
                        />
                        <span className="text-[11px] opacity-70">pts</span>
                      </div>
                    )}
                    <input
                      value={a.reason}
                      onChange={(e) => updateAction(a.id, { reason: e.target.value })}
                      placeholder="reason…"
                      className="flex-1 bg-transparent text-[12px] text-foreground/80 outline-none placeholder:text-current/40"
                    />
                    <button onClick={() => removeAction(a.id)} className="rounded p-1 hover:bg-black/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <AddActionMenu onAdd={addAction} />
            </div>
          </div>
        </div>
      </div>
      <VariablesPanel />
    </div>
  );
}

function countNodes(n?: TreeNode | null): number {
  if (!n) return 0;
  if (isGroup(n)) return 1 + (n.children ?? []).reduce((a, c) => a + countNodes(c), 0);
  return 1;
}

function findIn(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  if (isGroup(root)) for (const c of (root.children ?? [])) { const r = findIn(c, id); if (r) return r; }
  return null;
}
function mutateIn(root: TreeNode, id: string, fn: (n: TreeNode) => TreeNode): TreeNode {
  if (root.id === id) return fn(root);
  if (isGroup(root)) return { ...root, children: (root.children ?? []).map((c) => mutateIn(c, id, fn)) };
  return root;
}

interface TreeViewProps {
  node: TreeNode;
  depth: number;
  selected: string | null;
  onSelect: (id: string) => void;
  drag: DragState | null;
  setDrag: (d: DragState | null) => void;
  onReorder: (dragId: string, targetParentId: string, targetIndex: number) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onAddCondition: (parentId: string) => void;
  onAddGroup: (parentId: string, op: LogicalOp) => void;
  onUpdateNode: (id: string, patch: Partial<ConditionNode> | Partial<GroupNode>) => void;
  rootId: string;
}

function TreeView(props: TreeViewProps) {
  if (isGroup(props.node)) return <GroupView {...props} node={props.node} />;
  return <ConditionView {...props} node={props.node} />;
}

function GroupView({ node, depth, selected, onSelect, drag, setDrag, onReorder, onRemove, onDuplicate, onMove, onAddCondition, onAddGroup, onUpdateNode, rootId }: TreeViewProps & { node: GroupNode }) {
  const isRoot = node.id === rootId;
  const [addMenu, setAddMenu] = useState(false);
  const children = node.children ?? [];
  return (
    <div className={cn("relative", depth > 0 && "ml-3 border-l border-border/60 pl-3")}>
      {!isRoot && (
        <DropZone parentId={node.id} index={0} drag={drag} setDrag={setDrag} onReorder={onReorder} />
      )}
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          "mb-1.5 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-all",
          selected === node.id ? "border-primary/50 bg-primary/10" : "border-border bg-background/40 hover:border-border/80",
        )}
      >
        <span
          className="cursor-grab text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
          draggable
          onDragStart={() => setDrag({ id: node.id, parentId: null, index: 0 })}
          onDragEnd={() => setDrag(null)}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        {!isRoot && (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateNode(node.id, { negated: !node.negated }); }}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider transition-colors",
              node.negated ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            title="Toggle NOT"
          >
            {node.negated ? "NOT" : "¬"}
          </button>
        )}
        <div className="flex items-center rounded-md bg-foreground/5 p-0.5">
          {(["AND", "OR"] as LogicalOp[]).map((op) => (
            <button
              key={op}
              onClick={(e) => { e.stopPropagation(); onUpdateNode(node.id, { op }); }}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-bold tracking-wide transition-all",
                node.op === op
                  ? op === "AND" ? "bg-sky-500/80 text-white shadow-sm" : "bg-violet-500/80 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {op}
            </button>
          ))}
        </div>
        <div className="ml-1 flex items-center gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); onMove(node.id, -1); }} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowUp className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMove(node.id, 1); }} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowDown className="h-3 w-3" /></button>
          {!isRoot && <button onClick={(e) => { e.stopPropagation(); onDuplicate(node.id); }} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><Copy className="h-3 w-3" /></button>}
          {!isRoot && <button onClick={(e) => { e.stopPropagation(); onRemove(node.id); }} className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
        </div>
        <Popover open={addMenu} onOpenChange={setAddMenu} trigger={<Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={(e) => e.stopPropagation()}><Plus className="h-3.5 w-3.5" /></Button>}>
          {addMenu && (
            <>
              <DropdownLabel>Add to {node.op}</DropdownLabel>
              <DropdownItem onClick={() => { onAddCondition(node.id); setAddMenu(false); }}><VarIcon className="h-3.5 w-3.5" /> Condition</DropdownItem>
              <DropdownItem onClick={() => { onAddGroup(node.id, "AND"); setAddMenu(false); }}><CornerDownRight className="h-3.5 w-3.5" /> AND group</DropdownItem>
              <DropdownItem onClick={() => { onAddGroup(node.id, "OR"); setAddMenu(false); }}><CornerDownRight className="h-3.5 w-3.5" /> OR group</DropdownItem>
            </>
          )}
        </Popover>
        <span className="ml-auto text-[10px] text-muted-foreground/60">{children.length} items</span>
      </div>
      <div className="space-y-0.5">
        {children.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-[11.5px] text-muted-foreground/70">
            Empty {node.op} — add a condition or nested group.
          </div>
        )}
        {children.map((child, i) => (
          <div key={child.id}>
            <DropZone parentId={node.id} index={i} drag={drag} setDrag={setDrag} onReorder={onReorder} />
            <TreeView
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              drag={drag}
              setDrag={setDrag}
              onReorder={onReorder}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onAddCondition={onAddCondition}
              onAddGroup={onAddGroup}
              onUpdateNode={onUpdateNode}
              rootId={rootId}
            />
          </div>
        ))}
        {!isRoot && <DropZone parentId={node.id} index={children.length} drag={drag} setDrag={setDrag} onReorder={onReorder} />}
      </div>
    </div>
  );
}

function DropZone({ parentId, index, drag, setDrag, onReorder }: { parentId: string; index: number; drag: DragState | null; setDrag: (d: DragState | null) => void; onReorder: (dragId: string, targetParentId: string, targetIndex: number) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { if (drag) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { if (drag) onReorder(drag.id, parentId, index); setDrag(null); setOver(false); }}
      className={cn("transition-all", drag ? "h-2.5" : "h-1", over ? "my-0.5 rounded bg-primary/30 ring-1 ring-primary/60" : "")}
    />
  );
}

function ConditionView({ node, selected, onSelect, setDrag, onRemove, onDuplicate, onMove, onUpdateNode }: TreeViewProps & { node: ConditionNode }) {
  const variable = useMemo(() => VARIABLES.find((v) => v.key === node.variable), [node.variable]);
  const [opMenu, setOpMenu] = useState(false);
  const [varMenu, setVarMenu] = useState(false);
  return (
    <motion.div
      layout
      onClick={() => onSelect(node.id)}
      className={cn(
        "group mb-0.5 flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-all",
        selected === node.id ? "border-primary/50 bg-primary/10" : "border-border bg-background/40 hover:border-primary/30",
      )}
    >
      <span
        className="cursor-grab text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
        draggable
        onDragStart={() => setDrag({ id: node.id, parentId: null, index: 0 })}
        onDragEnd={() => setDrag(null)}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <Popover open={varMenu} onOpenChange={setVarMenu} align="start" trigger={<button onClick={(e) => e.stopPropagation()} className="rounded-md bg-sky-500/15 px-2 py-1 text-[11.5px] font-mono font-medium text-sky-600 dark:text-sky-300 hover:bg-sky-500/25">{variable?.label ?? node.variable}</button>}>
        {varMenu && (
          <div className="max-h-72 overflow-auto p-1" onClick={(e) => e.stopPropagation()}>
            {VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => { onUpdateNode(node.id, { variable: v.key, plugin: v.plugin, value: v.example ?? "" }); setVarMenu(false); }}
                className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[12px] hover:bg-accent"
              >
                <div>
                  <div className="font-mono text-foreground">{v.label}</div>
                  <div className="text-[10px] text-muted-foreground">{v.plugin}</div>
                </div>
                <span className="text-[10px] text-muted-foreground">{v.type}</span>
              </button>
            ))}
          </div>
        )}
      </Popover>
      <Popover open={opMenu} onOpenChange={setOpMenu} align="start" trigger={<button onClick={(e) => e.stopPropagation()} className="rounded-md bg-foreground/5 px-2 py-1 text-[11.5px] font-medium text-foreground hover:bg-foreground/10">{OPERATORS.find((o) => o.value === node.op)?.symbol} <span className="text-muted-foreground">{OPERATORS.find((o) => o.value === node.op)?.label}</span></button>}>
        {opMenu && (
          <div className="p-1" onClick={(e) => e.stopPropagation()}>
            {OPERATORS.map((o) => (
              <DropdownItem key={o.value} active={node.op === o.value} onClick={() => { onUpdateNode(node.id, { op: o.value }); setOpMenu(false); }}>
                <span className="font-mono w-6 text-center text-primary">{o.symbol}</span> {o.label}
              </DropdownItem>
            ))}
          </div>
        )}
      </Popover>
      {node.op === "is_true" || node.op === "is_false" ? (
        <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11.5px] font-mono text-emerald-600 dark:text-emerald-300">
          {node.op === "is_true" ? "true" : "false"}
        </span>
      ) : (
        <input
          value={node.value}
          onChange={(e) => onUpdateNode(node.id, { value: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="value"
          list="var-enum"
          className="min-w-[80px] flex-1 rounded-md border border-input bg-background/60 px-2 py-1 text-[11.5px] font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
      )}
      {variable?.plugin && (
        <Badge variant="muted" className="hidden text-[9.5px] sm:inline-flex">{variable.plugin}</Badge>
      )}
      <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={(e) => { e.stopPropagation(); onMove(node.id, -1); }} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowUp className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onMove(node.id, 1); }} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowDown className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(node.id); }} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><Copy className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(node.id); }} className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
      </div>
    </motion.div>
  );
}

function PalettePanel({ onAddCondition, onAddGroup }: { onAddCondition: () => void; onAddGroup: (op: LogicalOp) => void }) {
  const items = [
    { label: "Condition", icon: VarIcon, desc: "Variable comparison", onClick: onAddCondition, color: "bg-sky-500/15 text-sky-500" },
    { label: "AND Group", icon: CornerDownRight, desc: "All must match", onClick: () => onAddGroup("AND"), color: "bg-sky-500/15 text-sky-500" },
    { label: "OR Group", icon: CornerDownRight, desc: "Any can match", onClick: () => onAddGroup("OR"), color: "bg-violet-500/15 text-violet-500" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Drag Blocks</div>
        <div className="space-y-1.5">
          {items.map((it) => (
            <motion.button
              key={it.label}
              whileHover={{ y: -1 }}
              onClick={it.onClick}
              className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", it.color)}><it.icon className="h-3.5 w-3.5" /></span>
              <div>
                <div className="text-[12.5px] font-medium text-foreground">{it.label}</div>
                <div className="text-[10.5px] text-muted-foreground">{it.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background/30 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><ShieldMinus className="h-3.5 w-3.5" /> Logic</div>
        <div className="space-y-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="rounded bg-sky-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white">AND</span> all children must match</div>
          <div className="flex items-center gap-1.5"><span className="rounded bg-violet-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white">OR</span> any child can match</div>
          <div className="flex items-center gap-1.5"><span className="rounded bg-destructive/80 px-1.5 py-0.5 text-[9px] font-bold text-white">NOT</span> invert the group</div>
        </div>
      </div>
    </div>
  );
}

function VariablesPanel() {
  const [filter, setFilter] = useState("");
  const filtered = VARIABLES.filter((v) => v.label.toLowerCase().includes(filter.toLowerCase()) || v.key.includes(filter) || v.plugin.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variables</div>
        <Badge variant="muted" className="font-mono">{VARIABLES.length}</Badge>
      </div>
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="mb-2 h-8 text-[12px]" />
      <div className="scrollbar-thin -mr-1 flex-1 space-y-1 overflow-auto pr-1">
        {filtered.map((v) => (
          <div key={v.key} className="rounded-lg border border-border/60 bg-background/30 px-2.5 py-2 transition-colors hover:border-primary/30">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-foreground">{v.label}</span>
              <Badge variant="muted" className="text-[9px]">{v.type}</Badge>
            </div>
            <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{v.key}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{v.plugin}{v.unit ? ` · ${v.unit}` : ""}</div>
          </div>
        ))}
        {filtered.length === 0 && <div className="py-6 text-center text-[11px] text-muted-foreground">No variables match.</div>}
      </div>
    </div>
  );
}

function AddActionMenu({ onAdd }: { onAdd: (k: ActionKind) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} align="start" trigger={<Button variant="outline" size="sm" className="w-full border-dashed"><Plus className="h-3.5 w-3.5" /> Add action</Button>}>
      {open && (
        <>
          {ACTIONS.map((a) => {
            const Icon = ACTION_ICON[a.kind];
            return (
              <DropdownItem key={a.kind} onClick={() => { onAdd(a.kind); setOpen(false); }}>
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", ACTION_TONE[a.kind])}><Icon className="h-3.5 w-3.5" /></span>
                <div>
                  <div className="text-[12.5px] font-medium text-foreground">{a.kind}</div>
                  <div className="text-[10.5px] text-muted-foreground">{a.desc}</div>
                </div>
              </DropdownItem>
            );
          })}
        </>
      )}
    </Popover>
  );
}
