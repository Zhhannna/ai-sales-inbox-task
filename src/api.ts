import type { Lead, Message } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const api = {
  listMessages: () => getJson<Message[]>("/api/messages"),
  getMessage: (messageId: string) => getJson<Message>(`/api/messages/${encodeURIComponent(messageId)}`),
  listLeads: () => getJson<Lead[]>("/api/leads"),
  async extract(messageId: string) {
    const response = await fetch("/api/ai/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId }) });
    if (!response.ok) throw new Error(`Extraction failed (${response.status})`);
    return response.json() as Promise<{ product?: string; quantity?: number | null; material?: string | null; budget?: number | null }>;
  },
  async createLead(input: { sourceMessageId: string; product: string; quantity: number; material: string | null; budget: number | null }) {
    const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`Could not save lead (${response.status})`);
    return response.json() as Promise<Lead>;
  },
  async markContacted(leadId: string) {
    const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "CONTACTED" }) });
    if (!response.ok) throw new Error(`Could not update lead (${response.status})`);
    return response.json() as Promise<Lead>;
  },
};
