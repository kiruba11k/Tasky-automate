// 3D buddies, accessories and mystery eggs. Eggs are earned by real work (never by logging in); what they hatch into is
// rolled on the server so the roll cannot be steered. Ownership lives in the Achievement store as buddy:<id> / acc:<id> claims.
import { addDays } from './weekly.js';

export const BUDDY_IDS = ['cat', 'tabby', 'mouse', 'fox', 'panda', 'bunny', 'bear', 'dog', 'owl', 'penguin', 'dino', 'robot'];
export const STARTER_BUDDIES = ['cat', 'mouse', 'bunny', 'robot'];
export const ACCESSORIES = [
  { id: 'partyhat', slot: 'hat', name: 'Party hat' }, { id: 'tophat', slot: 'hat', name: 'Top hat' }, { id: 'crown', slot: 'hat', name: 'Crown' },
  { id: 'wizard', slot: 'hat', name: 'Wizard hat' }, { id: 'cap', slot: 'hat', name: 'Cap' }, { id: 'chef', slot: 'hat', name: 'Chef hat' }, { id: 'halo', slot: 'hat', name: 'Halo' },
  { id: 'scarf', slot: 'neck', name: 'Red scarf' }, { id: 'rainbow', slot: 'neck', name: 'Rainbow scarf' }, { id: 'bowtie', slot: 'neck', name: 'Bow tie' },
  { id: 'glasses', slot: 'face', name: 'Round glasses' }, { id: 'shades', slot: 'face', name: 'Cool shades' },
];
const SLOTS = ['hat', 'neck', 'face'];

export const eggsEarned = (doneCount, badgeCount) => (doneCount >= 3 ? 1 : 0) + Math.floor(doneCount / 10) + Math.floor(badgeCount / 3);

export async function buddyStatus(store, user) {
  const [done, ach] = await Promise.all([
    store.list('DailyTask', { query: { user_id: user.id, task_status: 'Completed' } }),
    store.list('Achievement', { query: { user_id: user.id } }),
  ]);
  const keys = ach.map((a) => a.key);
  const hatched = keys.filter((k) => k.startsWith('egg:')).length;
  const earned = eggsEarned(done.length, keys.filter((k) => k.startsWith('badge:')).length);
  const ownedBuddies = [...new Set([...STARTER_BUDDIES, ...keys.filter((k) => k.startsWith('buddy:')).map((k) => k.slice(6))])];
  const ownedAcc = keys.filter((k) => k.startsWith('acc:')).map((k) => k.slice(4));
  const next = done.length < 3 ? 3 : (Math.floor(done.length / 10) + 1) * 10;
  return {
    eggs: { earned, hatched, available: Math.max(0, earned - hatched), next_at: next, done: done.length },
    owned_buddies: ownedBuddies, owned_accessories: ownedAcc,
    buddy: user.buddy || 'auto', equipped: user.equipped || {},
    catalog: { buddies: BUDDY_IDS, accessories: ACCESSORIES },
  };
}

export async function hatchEgg(store, user, rng, today) {
  const st = await buddyStatus(store, user);
  if (st.eggs.available < 1) return { error: 'No eggs to hatch yet. Finish a few more tasks!', status: 409 };
  const lockedB = BUDDY_IDS.filter((b) => !st.owned_buddies.includes(b));
  const lockedA = ACCESSORIES.filter((a) => !st.owned_accessories.includes(a.id));
  let kind = rng() < 0.45 ? 'buddy' : 'accessory';
  if (kind === 'buddy' && !lockedB.length) kind = 'accessory';
  if (kind === 'accessory' && !lockedA.length) kind = lockedB.length ? 'buddy' : 'accessory';
  const pool = kind === 'buddy' ? (lockedB.length ? lockedB : BUDDY_IDS) : (lockedA.length ? lockedA : ACCESSORIES);
  const pick = pool[Math.floor(rng() * pool.length)];
  const id = pick.id || pick;
  const isNew = kind === 'buddy' ? lockedB.includes(id) : lockedA.some((a) => a.id === id);
  const n = st.eggs.hatched + 1;
  try {
    await store.insert('Achievement', { user_id: user.id, key: `egg:${n}`, date: today, meta: { kind, id, is_new: isNew } });
  } catch (e) {
    if (e.code === '23505') return { error: 'That egg was already hatched.', status: 409 };
    throw e;
  }
  if (isNew) await store.insert('Achievement', { user_id: user.id, key: `${kind === 'buddy' ? 'buddy' : 'acc'}:${id}`, date: today }).catch((e) => { if (e.code !== '23505') throw e; });
  return { kind, id, name: kind === 'accessory' ? pick.name : undefined, slot: kind === 'accessory' ? pick.slot : undefined, is_new: isNew, eggs_left: st.eggs.available - 1 };
}

/** Validates self-service buddy choices: you can only pin a buddy or wear an accessory you own. */
export function validateBuddyPrefs(body, status) {
  if (body.buddy !== undefined && body.buddy !== 'auto' && !status.owned_buddies.includes(body.buddy)) return 'You have not unlocked that buddy yet';
  if (body.equipped !== undefined) {
    const eq = body.equipped;
    if (!eq || typeof eq !== 'object' || Array.isArray(eq)) return 'equipped must be an object';
    for (const [slot, id] of Object.entries(eq)) {
      if (!SLOTS.includes(slot)) return 'Unknown accessory slot';
      if (id === null || id === '') continue;
      const acc = ACCESSORIES.find((a) => a.id === id);
      if (!acc || acc.slot !== slot) return 'Unknown accessory';
      if (!status.owned_accessories.includes(id)) return 'You have not unlocked that accessory yet';
    }
  }
  return null;
}

/** Everyone's buddy, plus how the week is going: feeds the team parade and the high-five scenes. */
export async function parade(store, today, weekStart) {
  const users = (await store.list('User')).filter((u) => u.status !== 'Inactive');
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const week = (await Promise.all(dates.map((d) => store.list('DailyTask', { query: { date: d } })))).flat();
  return users.map((u) => {
    const mine = week.filter((t) => t.user_id === u.id);
    return {
      id: u.id, name: u.full_name || u.email, buddy: u.buddy || null, equipped: u.equipped || {},
      planned: mine.length, done: mine.filter((t) => t.task_status === 'Completed').length,
      done_today: mine.filter((t) => t.date === today && t.task_status === 'Completed').length,
    };
  });
}
