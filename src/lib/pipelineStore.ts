import { SAMPLE_PIPELINES, type PipelineNode, type PipelineEdge } from "./pipelineData";

export interface PipelineVersion {
  id: string;
  version: string;
  label: "draft" | "published" | "archived";
  savedAt: string;
  savedBy: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  note: string;
}

export interface PipelineDocument {
  id: string;
  name: string;
  description: string;
  tags: string[];
  owner: string;
  createdAt: string;
  updatedAt: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  versions: PipelineVersion[];
  publishedVersionId: string | null;
  dirty: boolean;
}

interface Listener {
  (): void;
}

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

function seedDocuments(): Record<string, PipelineDocument> {
  const docs: Record<string, PipelineDocument> = {};
  for (const p of SAMPLE_PIPELINES) {
    const vId = uid("ver");
    docs[p.id] = {
      id: p.id,
      name: p.name,
      description: p.description,
      tags: [...p.tags],
      owner: p.owner,
      createdAt: p.updatedAt,
      updatedAt: p.updatedAt,
      nodes: p.nodes.map((n) => ({ ...n, data: { ...n.data, config: { ...n.data.config } } })),
      edges: p.edges.map((e) => ({ ...e })),
      versions: [
        { id: vId, version: p.version, label: "published", savedAt: p.updatedAt, savedBy: p.owner, nodes: p.nodes, edges: p.edges, note: "Initial published version" },
      ],
      publishedVersionId: vId,
      dirty: false,
    };
  }
  return docs;
}

let docs: Record<string, PipelineDocument> = seedDocuments();
let order: string[] = Object.keys(docs);
const listeners = new Set<Listener>();
let versionCounter = 1;

function bump() {
  for (const l of listeners) l();
}

function nextVersionLabel(doc: PipelineDocument): string {
  const n = doc.versions.length + 1;
  return `v${n}`;
}

export const pipelineStore = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  list(): PipelineDocument[] {
    return order.map((id) => docs[id]).filter(Boolean);
  },
  get(id: string): PipelineDocument | undefined {
    return docs[id];
  },
  setCanvas(id: string, nodes: PipelineNode[], edges: PipelineEdge[], markDirty = true) {
    const d = docs[id];
    if (!d) return;
    d.nodes = nodes;
    d.edges = edges;
    if (markDirty) d.dirty = true;
    bump();
  },
  rename(id: string, name: string, description?: string) {
    const d = docs[id];
    if (!d) return;
    d.name = name;
    if (description !== undefined) d.description = description;
    d.updatedAt = now();
    bump();
  },
  create(name: string): string {
    const id = uid("pl");
    const t = now();
    docs[id] = {
      id, name, description: "New fraud pipeline", tags: [], owner: "you",
      createdAt: t, updatedAt: t, nodes: [], edges: [], versions: [], publishedVersionId: null, dirty: true,
    };
    order = [id, ...order];
    bump();
    return id;
  },
  clone(id: string): string | null {
    const d = docs[id];
    if (!d) return null;
    const nid = uid("pl");
    const t = now();
    docs[nid] = {
      id: nid,
      name: `${d.name} (Clone)`,
      description: d.description,
      tags: [...d.tags],
      owner: d.owner,
      createdAt: t,
      updatedAt: t,
      nodes: d.nodes.map((n) => ({ ...n, data: { ...n.data, config: { ...n.data.config } } })),
      edges: d.edges.map((e) => ({ ...e })),
      versions: [],
      publishedVersionId: null,
      dirty: true,
    };
    order = [nid, ...order];
    bump();
    return nid;
  },
  remove(id: string) {
    if (!docs[id]) return;
    delete docs[id];
    order = order.filter((x) => x !== id);
    bump();
  },
  save(id: string, note = "Manual save"): string | null {
    const d = docs[id];
    if (!d) return null;
    const vId = uid("ver");
    const ver: PipelineVersion = {
      id: vId,
      version: nextVersionLabel(d),
      label: "draft",
      savedAt: now(),
      savedBy: d.owner,
      nodes: d.nodes.map((n) => ({ ...n, data: { ...n.data, config: { ...n.data.config } } })),
      edges: d.edges.map((e) => ({ ...e })),
      note,
    };
    d.versions.unshift(ver);
    d.dirty = false;
    d.updatedAt = ver.savedAt;
    bump();
    return vId;
  },
  publish(id: string, note = "Published"): string | null {
    const d = docs[id];
    if (!d) return null;
    const vId = uid("ver");
    const ver: PipelineVersion = {
      id: vId,
      version: nextVersionLabel(d),
      label: "published",
      savedAt: now(),
      savedBy: d.owner,
      nodes: d.nodes.map((n) => ({ ...n, data: { ...n.data, config: { ...n.data.config } } })),
      edges: d.edges.map((e) => ({ ...e })),
      note,
    };
    if (d.publishedVersionId) {
      const prev = d.versions.find((v) => v.id === d.publishedVersionId);
      if (prev) prev.label = "archived";
    }
    d.versions.unshift(ver);
    d.publishedVersionId = vId;
    d.dirty = false;
    d.updatedAt = ver.savedAt;
    bump();
    return vId;
  },
  restoreVersion(id: string, versionId: string) {
    const d = docs[id];
    const v = d?.versions.find((x) => x.id === versionId);
    if (!d || !v) return;
    d.nodes = v.nodes.map((n) => ({ ...n, data: { ...n.data, config: { ...n.data.config } } }));
    d.edges = v.edges.map((e) => ({ ...e }));
    d.dirty = true;
    d.updatedAt = now();
    bump();
  },
};

export { uid, now };
export const __versionCounter = versionCounter;
