// Keeps the tracker store in step with the backend (documents under /api/tracker).
// The UI changes the store as before. This module (1) loads everything the signed-in person may see, (2) sends each local
// change to the server as a JSON merge patch, and (3) polls for other people's changes.
import { request, getToken } from "@/api/client";
import { useStore, emptyState } from "./store.js";
import { diffPatch } from "./lib/diffPatch.js";
import { rollProjectPeriods } from "./lib/domain.js";
import { isAdminTier, roleOf } from "./lib/constants.js";
import { setPeople } from "./lib/people.js";
import { toast } from "./kit/toast.js";

// store collection -> document kind. "list" collections hold objects with an id, "map" collections are keyed objects.
const COLLECTIONS = {
  tasks: { kind: "task", shape: "list" },
  projects: { kind: "project", shape: "list" },
  notices: { kind: "notice", shape: "list" },
  convs: { kind: "conv", shape: "list" },
  msgs: { kind: "msg", shape: "list" },
  daily: { kind: "daily", shape: "map" },
  weekly: { kind: "weekly", shape: "map" },
  profiles: { kind: "profile", shape: "map" },
  // an alias is a plain string in the store, a small document on the server
  aliases: { kind: "alias", shape: "map", wrap: (alias) => ({ alias }), unwrap: (doc) => doc.alias },
};
const BY_KIND = Object.fromEntries(Object.entries(COLLECTIONS).map(([name, c]) => [c.kind, { name, ...c }]));
const POLL_MS = 30000; // safety net only; changes arrive instantly over the live stream
const FLUSH_MS = 120;

const docId = (kind, key) => `${kind}\u0000${key}`;
const clone = (v) => JSON.parse(JSON.stringify(v));

/** The documents of a state: Map docId -> { kind, key, data }. */
function documents(state) {
  const out = new Map();
  for (const [name, c] of Object.entries(COLLECTIONS)) {
    const value = state[name];
    if (c.shape === "list") for (const item of value) out.set(docId(c.kind, item.id), { kind: c.kind, key: item.id, data: item });
    else for (const [key, data] of Object.entries(value)) out.set(docId(c.kind, key), { kind: c.kind, key, data: c.wrap ? c.wrap(data) : data });
  }
  return out;
}

let session = null;

/** Starts syncing for the signed-in user. Resolves once the first load is done; returns { stop }. */
export async function startSync(user) {
  if (session) session.stop();
  const synced = new Map(); // docId -> last data known to match the server
  const pending = new Set(); // docIds with local changes not yet saved
  let since = "";
  let timer = null;
  let flushTimer = null;
  let stopped = false;
  let applying = false;
  let busy = Promise.resolve();

  try { if (localStorage.getItem("tracker_debug")) window.__tracker = { useStore }; } catch { /* ignore */ }
  const people = await request("GET", "/api/tracker/people");
  setPeople(people);

  /** Applies server documents to the store (without echoing them back). */
  const apply = (docs, { replace = false } = {}) => {
    applying = true;
    try {
      useStore.setState((state) => {
        const next = replace ? { ...state, ...emptyState(), me: user.id } : { ...state };
        const draft = {};
        const get = (name) => (draft[name] ??= COLLECTIONS[name].shape === "list" ? [...next[name]] : { ...next[name] });
        for (const d of docs) {
          const c = BY_KIND[d.kind];
          if (!c) continue;
          const id = docId(d.kind, d.key);
          if (!replace && pending.has(id)) continue; // my unsaved change wins until it is saved
          const coll = get(c.name);
          // A new week or month started: show the project's counters rolled over. Saved with the next manager edit.
          if (d.kind === "project" && !d.deleted) d.data = rollProjectPeriods({ admins: [], finalized: {}, pastWeeks: [], pastMonths: [], ...d.data });
          if (d.deleted) {
            synced.delete(id);
            if (c.shape === "list") { const i = coll.findIndex((x) => x.id === d.key); if (i >= 0) coll.splice(i, 1); } else delete coll[d.key];
          } else {
            synced.set(id, clone(d.data));
            if (c.shape === "list") { const i = coll.findIndex((x) => x.id === d.key); if (i >= 0) coll[i] = d.data; else coll.push(d.data); } else coll[d.key] = c.unwrap ? c.unwrap(d.data) : d.data;
          }
        }
        Object.assign(next, draft);
        if (draft.convs) { // a conversation that is gone takes its messages with it
          const alive = new Set(draft.convs.map((c) => c.id));
          next.msgs = (draft.msgs ?? next.msgs).filter((m) => alive.has(m.convId));
        }
        return next;
      });
    } finally {
      applying = false;
    }
  };

  /**
   * A project's day is finalized once everyone on its team has sent their end of day. Two people can send within one poll
   * of each other, and neither knows about the other's, so after every load the signed-in person finishes the job.
   */
  const finalizeCompleteDays = () => {
    const { projects, daily, me } = useStore.getState();
    const limit = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const days = [...new Set(Object.keys(daily).map((k) => k.split("|")[1]))].filter((d) => d >= limit);
    let changed = false;
    const next = projects.map((p) => {
      if (p.status !== "active" || !p.teamIds?.length || !(p.teamIds.includes(me) || isAdminTier(roleOf(me)))) return p;
      const finalized = { ...p.finalized };
      for (const d of days) {
        if (finalized[d]) continue;
        const sent = p.teamIds.map((id) => daily[`${id}|${d}`]?.eodAt);
        if (sent.every(Boolean)) { finalized[d] = [...sent].sort().pop(); changed = true; }
      }
      return changed && finalized !== p.finalized ? { ...p, finalized } : p;
    });
    if (changed) useStore.setState({ projects: next });
  };

  let pulling = Promise.resolve();
  const pull = () => {
    pulling = pulling.then(pullOnce, pullOnce); // one at a time, so `since` only ever moves forward
    return pulling;
  };
  const pullOnce = async () => {
    const res = await request("GET", `/api/tracker/docs${since ? `?since=${encodeURIComponent(since)}` : ""}`);
    apply(res.docs, { replace: !since });
    finalizeCompleteDays();
    // Overlap a little so a write that lands at the same instant is never missed (re-applying is harmless).
    since = new Date(new Date(res.now).getTime() - 2000).toISOString();
  };

  /** Sends what changed locally since the last save. */
  const flush = () => {
    busy = busy.then(async () => {
      if (stopped) return;
      const patches = [];
      const deletes = [];
      const current = documents(useStore.getState());
      for (const id of [...pending]) {
        const doc = current.get(id);
        if (!doc) { const [kind, key] = id.split("\u0000"); if (synced.has(id)) deletes.push({ kind, key }); continue; }
        const patch = diffPatch(synced.get(id) ?? {}, doc.data);
        if (patch !== undefined) patches.push({ kind: doc.kind, key: doc.key, patch, id, data: clone(doc.data) });
      }
      for (const id of pending) if (!patches.some((p) => p.id === id) && !deletes.some((d) => docId(d.kind, d.key) === id)) pending.delete(id);
      if (!patches.length && !deletes.length) return;
      try {
        const res = await request("POST", "/api/tracker/docs/batch", {
          patches: patches.map(({ kind, key, patch }) => ({ kind, key, patch })),
          deletes,
        });
        let rejected = null;
        for (const r of res.results) {
          const id = docId(r.kind, r.key);
          if (r.ok) {
            const p = patches.find((x) => x.id === id);
            if (p) synced.set(id, p.data); else synced.delete(id);
            pending.delete(id);
          } else rejected = rejected ?? r;
        }
        if (rejected) {
          toast({ title: "Some changes could not be saved", description: rejected.error || "You are not allowed to do that.", tone: "info" });
          pending.clear();
          await pull(); // show the server's version again
          since = "";
          await pull();
        }
      } catch (e) {
        toast({ title: "Could not reach the server", description: "Your last change is kept here and will be retried.", tone: "info" });
        flushTimer = setTimeout(flush, 4000);
      }
    });
    return busy;
  };

  const schedule = () => {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_MS);
  };

  await pull();
  useStore.setState({ me: user.id });

  // Local changes -> mark which documents changed (cheap reference checks per collection), then save soon.
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (applying) return;
    let any = false;
    for (const [name, c] of Object.entries(COLLECTIONS)) {
      if (state[name] === prev[name]) continue;
      const before = c.shape === "list" ? new Map(prev[name].map((x) => [x.id, x])) : new Map(Object.entries(prev[name]));
      const after = c.shape === "list" ? new Map(state[name].map((x) => [x.id, x])) : new Map(Object.entries(state[name]));
      for (const [key, data] of after) if (before.get(key) !== data) { pending.add(docId(c.kind, key)); any = true; }
      for (const key of before.keys()) if (!after.has(key)) { pending.add(docId(c.kind, key)); any = true; }
    }
    if (any) schedule();
  });

  // Live stream: the server says "changed" whenever anyone saves, and we fetch right away.
  const ctl = new AbortController();
  let queued = false;
  const pullSoon = () => {
    if (queued || stopped) return;
    queued = true;
    setTimeout(() => { queued = false; pull().catch(() => {}); }, 80);
  };
  (async function listen() {
    while (!stopped) {
      try {
        const res = await fetch("/api/tracker/stream", { headers: { authorization: `Bearer ${getToken()}` }, signal: ctl.signal });
        if (!res.ok || !res.body) throw new Error("stream unavailable");
        pullSoon(); // catch up on anything missed while disconnected
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop();
          if (parts.some((p) => p.includes("data: changed"))) pullSoon();
          if (parts.some((p) => p.includes("data: people"))) request("GET", "/api/tracker/people").then((list) => { setPeople(list); useStore.setState((s) => ({ ...s })); }).catch(() => {});
        }
      } catch { /* reconnect below */ }
      if (!stopped) await new Promise((r) => setTimeout(r, 2000));
    }
  })();

  const tick = async () => {
    if (stopped) return;
    if (!document.hidden) {
      try { await pull(); } catch { /* offline: try again next time */ }
    }
    timer = setTimeout(tick, POLL_MS);
  };
  timer = setTimeout(tick, POLL_MS);
  const onVisible = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
  document.addEventListener("visibilitychange", onVisible);
  const onUnload = () => { if (pending.size) flush(); };
  window.addEventListener("pagehide", onUnload);

  session = {
    stop() {
      stopped = true;
      ctl.abort();
      clearTimeout(timer);
      clearTimeout(flushTimer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onUnload);
      useStore.setState(emptyState());
      session = null;
    },
    flush,
    pullNow: async () => { await flush(); await pull(); },
    reloadPeople: async () => setPeople(await request("GET", "/api/tracker/people")),
  };
  try { if (localStorage.getItem("tracker_debug")) window.__tracker = { useStore, sync: session }; } catch { /* ignore */ }
  return session;
}

export const currentSession = () => session;
