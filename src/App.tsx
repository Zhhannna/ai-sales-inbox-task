import { useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Lead, Message } from "./types";

const path = window.location.pathname.replace(/\/+$/, "") || "/inbox";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function Layout({ children }: { children: ReactNode }) {
  const isPipeline = path === "/pipeline";
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/inbox" aria-label="InboxIQ home"><span className="brand-mark">IQ</span><span>InboxIQ</span></a>
        <nav aria-label="Primary navigation">
          <a className={!isPipeline ? "nav-link active" : "nav-link"} href="/inbox" aria-current={!isPipeline ? "page" : undefined}>Inbox</a>
          <a className={isPipeline ? "nav-link active" : "nav-link"} href="/pipeline" aria-current={isPipeline ? "page" : undefined}>Pipeline</a>
        </nav>
        <span className="status-pill"><span className="status-dot" /> Local workspace</span>
      </header>
      {children}
    </div>
  );
}

function StateMessage({ children }: { children: ReactNode }) {
  return <p className="state-message">{children}</p>;
}

function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    api.listMessages().then((result) => {
      if (active) { setMessages(result); setState("ready"); }
    }).catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  return (
    <main className="page-container">
      <section className="page-heading"><div><p className="eyebrow">Sales workspace</p><h1>Inbox</h1><p className="muted">Review inbound conversations and decide what deserves a follow-up.</p></div><div className="metric-card"><strong>{messages.length}</strong><span>messages</span></div></section>
      <section className="panel" aria-labelledby="messages-heading">
        <div className="panel-heading"><h2 id="messages-heading">Latest messages</h2><span className="muted">Deterministic demo data</span></div>
        {state === "loading" && <StateMessage>Loading inbox…</StateMessage>}
        {state === "error" && <StateMessage>Could not load the inbox. Check that the API is running.</StateMessage>}
        {state === "ready" && (messages.length === 0 ? <p className="state-message">No messages yet.</p> : <ul className="message-list">{messages.map((message) => <MessageRow key={message.id} message={message} />)}</ul>)}
      </section>
    </main>
  );
}

function MessageRow({ message }: { message: Message }) {
  return (
    <li>
      <a className="message-row" href={`/inbox/${message.id}`}>
        <span className="avatar">{message.senderName.slice(0, 1)}</span>
        <span className="message-copy">
          <span className="message-meta"><strong>{message.senderName}</strong><span>{formatDate(message.createdAt)}</span></span>
          <span className="message-subject">{message.subject}</span>
          <span className="message-preview">{message.company} · {message.body}</span>
        </span>
        <span className="row-arrow" aria-hidden="true">→</span>
      </a>
    </li>
  );
}

function DetailPage({ messageId }: { messageId: string }) {
  const [message, setMessage] = useState<Message | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [fields, setFields] = useState({ product: "", quantity: "", material: "", budget: "" });
  const [busy, setBusy] = useState<"extract" | "save" | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    api.getMessage(messageId).then((result) => {
      if (active) { setMessage(result); setState("ready"); }
    }).catch(() => active && setState("error"));
    return () => { active = false; };
  }, [messageId]);

  if (state === "loading") return <main className="page-container"><StateMessage>Loading message…</StateMessage></main>;
  if (state === "error" || !message) return <main className="page-container"><StateMessage>Message not found.</StateMessage></main>;

  return (
    <main className="page-container detail-layout">
      <a className="back-link" href="/inbox">← Back to inbox</a>
      <section className="detail-grid">
        <article className="panel message-detail">
          <p className="eyebrow">Inbound message</p>
          <h1>{message.subject}</h1>
          <dl className="message-facts">
            <div><dt>Sender</dt><dd>{message.senderName} · {message.senderEmail}</dd></div>
            <div><dt>Company</dt><dd>{message.company}</dd></div>
          </dl>
          <div className="message-body">{message.body}</div>
        </article>
        <aside className="panel placeholder-panel" aria-label="Lead details">
          <p className="eyebrow">Next step</p>
          {formError && <p role="alert" className="form-error">{formError}</p>}
          <form className="lead-form" onSubmit={async (event) => {
            event.preventDefault(); setFormError(""); setBusy("save");
            try {
              await api.createLead({ sourceMessageId: messageId, product: fields.product, quantity: Number(fields.quantity), material: fields.material || null, budget: fields.budget === "" ? null : Number(fields.budget) });
              window.location.assign("/pipeline");
            } catch (error) { setFormError(error instanceof Error ? error.message : "Could not save lead."); }
            finally { setBusy(null); }
          }}>
            <button type="button" disabled={busy !== null} onClick={async () => {
              setFormError(""); setBusy("extract");
              try {
                const extracted = await api.extract(messageId);
                const hasData = Object.values(extracted).some((value) => value !== null && value !== undefined && value !== "");
                if (!hasData) { setFormError("No details were extracted. Enter the lead details manually."); return; }
                setFields((current) => ({
                  product: current.product === "" ? extracted.product ?? current.product : current.product,
                  quantity: current.quantity === "" && extracted.quantity != null ? String(extracted.quantity) : current.quantity,
                  material: current.material === "" ? extracted.material ?? current.material : current.material,
                  budget: current.budget === "" && extracted.budget != null ? String(extracted.budget) : current.budget,
                }));
              } catch (error) { setFormError(error instanceof Error ? error.message : "Extraction failed."); }
              finally { setBusy(null); }
            }}>{busy === "extract" ? "Extracting…" : "Extract with AI"}</button>
            <label>Product<input required value={fields.product} onChange={(event) => setFields({ ...fields, product: event.target.value })} /></label>
            <label>Quantity<input required type="number" min="1" step="1" value={fields.quantity} onChange={(event) => setFields({ ...fields, quantity: event.target.value })} /></label>
            <label>Material<input value={fields.material} onChange={(event) => setFields({ ...fields, material: event.target.value })} /></label>
            <label>Budget<input type="number" min="0" step="any" value={fields.budget} onChange={(event) => setFields({ ...fields, budget: event.target.value })} /></label>
            <button type="submit" disabled={busy !== null}>{busy === "save" ? "Saving…" : "Save lead"}</button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    api.listLeads().then((result) => {
      if (active) { setLeads(result); setState("ready"); }
    }).catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  return (
    <main className="page-container">
      <section className="page-heading"><div><p className="eyebrow">Revenue view</p><h1>Pipeline</h1><p className="muted">Saved leads will appear here.</p></div><div className="metric-card"><strong>{leads.length}</strong><span>leads</span></div></section>
      <section className="panel" aria-labelledby="pipeline-heading">
        <div className="panel-heading"><h2 id="pipeline-heading">Leads</h2></div>
        {state === "loading" && <StateMessage>Loading pipeline…</StateMessage>}
        {state === "error" && <StateMessage>Could not load the pipeline.</StateMessage>}
        {actionError && <p role="alert" className="form-error">{actionError}</p>}
        {state === "ready" && (leads.length === 0 ? <p className="state-message">No leads yet.</p> : <ul className="lead-list">{leads.map((lead) => <LeadCard key={lead.id} lead={lead} disabled={saving === lead.id} onContact={async () => {
          setSaving(lead.id); setActionError("");
          try { const updated = await api.markContacted(lead.id); setLeads((items) => items.map((item) => item.id === updated.id ? updated : item)); }
          catch (error) { setActionError(error instanceof Error ? error.message : "Could not update lead."); }
          finally { setSaving(null); }
        }} />)}</ul>)}
      </section>
    </main>
  );
}

function LeadCard({ lead, disabled, onContact }: { lead: Lead; disabled: boolean; onContact: () => void }) {
  return <li className="lead-card"><div><h3>{lead.product}</h3><p>{lead.quantity} unit{lead.quantity === 1 ? "" : "s"}{lead.material ? ` · ${lead.material}` : ""}</p><span className="muted">{lead.status} · {lead.budget === null ? "Budget unknown" : `${lead.budget}`}</span>{lead.status === "NEW" && <button type="button" disabled={disabled} onClick={onContact}>{disabled ? "Saving…" : "Mark as contacted"}</button>}</div></li>;
}

export function App() {
  const content = path === "/pipeline" ? <PipelinePage /> : path.startsWith("/inbox/") ? <DetailPage messageId={decodeURIComponent(path.slice("/inbox/".length))} /> : <InboxPage />;
  return <Layout>{content}</Layout>;
}
