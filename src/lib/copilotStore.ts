// In-memory database for the AI Copilot. No Supabase / no persistence —
// state lives only for the browser session. Conversations, generated
// pipeline templates, and design documents are all kept here.

export interface StoredTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: { type: string; label: string; assetRef?: string }[];
  edges: { from: string; to: string }[];
  createdAt: string;
  scenario: string;
}

export interface StoredDesignDoc {
  id: string;
  title: string;
  scenario: string;
  markdown: string;
  createdAt: string;
  architecture: string;
  championModel?: string;
}

export interface StoredConversation {
  id: string;
  title: string;
  messages: { id: string; role: "user" | "assistant"; content: string; ts: number }[];
  createdAt: string;
}

interface CopilotDB {
  conversations: StoredConversation[];
  templates: StoredTemplate[];
  designDocs: StoredDesignDoc[];
}

const db: CopilotDB = {
  conversations: [],
  templates: [],
  designDocs: [],
};

export function listTemplates(): StoredTemplate[] {
  return [...db.templates];
}

export function addTemplate(t: StoredTemplate): StoredTemplate {
  db.templates.unshift(t);
  return t;
}

export function listDesignDocs(): StoredDesignDoc[] {
  return [...db.designDocs];
}

export function addDesignDoc(d: StoredDesignDoc): StoredDesignDoc {
  db.designDocs.unshift(d);
  return d;
}

export function listConversations(): StoredConversation[] {
  return [...db.conversations];
}

export function saveConversation(c: StoredConversation): StoredConversation {
  const idx = db.conversations.findIndex((x) => x.id === c.id);
  if (idx >= 0) db.conversations[idx] = c;
  else db.conversations.unshift(c);
  return c;
}

export function resetDB(): void {
  db.conversations = [];
  db.templates = [];
  db.designDocs = [];
}

export function dbStats() {
  return {
    conversations: db.conversations.length,
    templates: db.templates.length,
    designDocs: db.designDocs.length,
  };
}
