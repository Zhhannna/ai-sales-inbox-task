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
};
