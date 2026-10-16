// The bookkeeping of sync.js, kept free of the store and the network so it can be tested.
//   pending: Set of docIds with local changes not saved yet; synced: Map docId -> data the server is known to hold.
import { diffPatch } from "./diffPatch.js";

export const docId = (kind, key) => `${kind}\u0000${key}`;
const clone = (v) => JSON.parse(JSON.stringify(v));

/** What to send now: a merge patch per changed document and the deletions. Entries that turned out to be no-ops leave `pending`. */
export function buildBatch({ pending, synced, current }) {
  const patches = [];
  const deletes = [];
  for (const id of [...pending]) {
    const doc = current.get(id);
    if (!doc) { const [kind, key] = id.split("\u0000"); if (synced.has(id)) deletes.push({ kind, key }); continue; }
    const patch = diffPatch(synced.get(id) ?? {}, doc.data);
    if (patch !== undefined) patches.push({ kind: doc.kind, key: doc.key, patch, id, data: clone(doc.data) });
  }
  for (const id of [...pending]) if (!patches.some((p) => p.id === id) && !deletes.some((d) => docId(d.kind, d.key) === id)) pending.delete(id);
  return { patches, deletes };
}

/**
 * Records the server's answer. A document that was saved is only finished when it did not change again while the request was on
 * its way: if it did, it stays pending (so the next save sends the rest and a refresh cannot overwrite the newer edit).
 * `current` is the documents of the store as they are now. Returns the answers that were refused.
 */
export function settleBatch({ batch, results, pending, synced, current }) {
  const rejected = [];
  for (const r of results) {
    const id = docId(r.kind, r.key);
    if (!r.ok) { rejected.push(r); continue; }
    const sent = batch.patches.find((x) => x.id === id);
    if (!sent) { synced.delete(id); if (!current.has(id)) pending.delete(id); continue; } // a deletion (kept if the document was made again meanwhile)
    synced.set(id, sent.data);
    const now = current.get(id);
    if (now && diffPatch(sent.data, now.data) !== undefined) continue; // edited again while saving
    pending.delete(id);
  }
  return rejected;
}
