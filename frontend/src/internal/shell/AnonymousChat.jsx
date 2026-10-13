import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Smile, Send, Check } from 'lucide-react';
import { Emoji3D } from './Emoji3D';
import { LogOut, Plus, Trash2, Users, VenetianMask } from 'lucide-react';
import { ConfirmModal } from '@/internal/kit/ConfirmModal';
import { toast } from '@/internal/kit/toast';
import { Se as useStore, Qe as PEOPLE, Ya as Modal, be as firstName, nt as fullName } from '@/internal/min';
import { cx } from '@/internal/ui/cx';
import { Button } from '@/internal/ui/Button';
import { Avatar } from '@/internal/ui/Avatar';
import { INPUT_CLASS, timeAgo } from '@/internal/ui/format';

const PICKER_TABS = [
  ['Smileys', ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '😎', '🤓', '🥳', '🤗', '🤔', '🫡', '🙄', '😏', '😐', '😮', '😱', '😴', '😢', '😭', '😡', '🤯', '💀', '👻', '🤖', '🙈']],
  ['Hands', ['👍', '👎', '👏', '🙌', '🫶', '🙏', '🤝', '💪', '👋', '✌️', '🤞', '👌', '✊', '👊', '🖐', '🤙', '✍️', '🫰']],
  ['Hearts', ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💖', '💕', '💗', '😍', '🥰', '😘', '✨', '💫', '🌟']],
  ['Party', ['🎉', '🎊', '🥳', '🎈', '🎁', '🎂', '🍾', '🥂', '🏆', '🥇', '🥈', '🥉', '🏅', '👑', '🔥', '💯', '🚀', '⭐', '🌈', '🎶', '🎵', '🎸', '🎮', '🎯']],
  ['Work', ['💼', '📊', '📈', '📉', '📅', '📆', '📌', '📍', '📎', '📋', '📝', '✅', '❌', '⚠️', '⏰', '⏳', '💡', '🔔', '📞', '📱', '💻', '🖥', '📧', '📣', '🔍', '🔑', '🧠', '🧩', '🧭', '🛠', '🔧', '📦']],
  ['Food', ['☕', '🍵', '🍕', '🍔', '🍟', '🍩', '🍪', '🍫', '🍦', '🍰', '🧁', '🍿', '🥗', '🍜', '🥪', '🍎', '🍌', '🍊', '🍉', '🍒', '🥕', '🍺', '🍷', '🥤']],
  ['Nature', ['🌞', '🌙', '⛅', '🌧', '☔', '❄️', '🌈', '🌸', '🌻', '🍀', '🌳', '🌿', '🌱', '🍁', '🌊', '⛰', '🐶', '🐱', '🐼', '🦊', '🐯', '🐰', '🐸', '🐵', '🦄', '🐢', '🦉', '🐙']],
];
const PICKER = PICKER_TABS[0][1];
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*\s*){1,3}$/u;
const EMOJI_PARTS = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*)/gu;
const emojisOf = (text) => String(text).split(EMOJI_PARTS).filter((_, i) => i % 2);

/** A burst of 3D emojis floating up the chat: played when an emoji-only message is sent or arrives. */
function Burst({ emojis, burstKey }) {
  const items = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ e: emojis[i % emojis.length], left: 6 + Math.random() * 86, delay: Math.random() * 0.5, dur: 1.8 + Math.random() * 1.2, size: 1.4 + Math.random() * 1.4, sway: (Math.random() - 0.5) * 60 })), [burstKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="chat-burst" aria-hidden="true">
      {items.map((it, i) => (
        <span key={i} className="chat-burst-item" style={{ left: `${it.left}%`, animationDelay: `${it.delay}s`, animationDuration: `${it.dur}s`, '--sway': `${it.sway}px` }}>
          <Emoji3D e={it.e} size={`${it.size}rem`} />
        </span>
      ))}
    </div>
  );
}

/** Chat panel shown in the floating chat popup (original: `tue`). Chats can be named (real names) or anonymous (aliases). */
export function AnonymousChat({ onClose }) {
  const { me, convs, msgs, aliases, send, createConv, deleteMessage, leaveConv, renameConv, deleteConv } = useStore();
  const [leaving, setLeaving] = useState(false);
  const myConvs = useMemo(() => convs.filter((c) => c.memberIds.includes(me)), [convs, me]);
  const [activeId, setActiveId] = useState(myConvs[0]?.id);
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [picked, setPicked] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [anon, setAnon] = useState(false);
  const [picker, setPicker] = useState(false);
  const [tab, setTab] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [burst, setBurst] = useState(null);
  const seen = useRef(null); // message ids already on screen: only newer ones animate in
  const active = myConvs.find((c) => c.id === activeId) ?? myConvs[0];
  const messages = msgs.filter((m) => m.convId === active?.id);
  const myNames = active ? aliases[`${me}:${active.id}`]?.used ?? [] : []; // every name I have written under in this chat (a new one each day)
  const myAlias = active ? aliases[`${me}:${active.id}`]?.alias : undefined;
  useEffect(() => { setRenaming(false); }, [activeId]);
  const [menuFor, setMenuFor] = useState(null); // anonymous chats: tap one of my own messages to reveal Delete
  const [peek, setPeek] = useState(false);
  const named = active ? active.anonymous === false : false;
  const isMine = (m) => (m.from ? m.from === me : myNames.includes(m.alias));
  const endRef = useRef(null);

  useEffect(() => {
    // braces on purpose: an effect must not return a value, and some browsers' scrollIntoView does (React then tries to call it on cleanup)
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, active?.id]);

  // new messages (not the ones already there) get an entrance animation; emoji-only ones set off a burst of 3D emojis
  useEffect(() => {
    const ids = messages.map((m) => m.id);
    if (seen.current === null || seen.current.convId !== active?.id) { seen.current = { convId: active?.id, ids: new Set(ids), initial: new Set(ids) }; return; }
    const fresh = messages.filter((m) => !seen.current.ids.has(m.id));
    fresh.forEach((m) => seen.current.ids.add(m.id));
    const last = fresh.at(-1);
    if (last && EMOJI_ONLY.test(String(last.text).trim())) setBurst({ k: Date.now(), emojis: emojisOf(last.text) });
  }, [messages.length, active?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!burst) return undefined;
    const t = setTimeout(() => setBurst(null), 3600);
    return () => clearTimeout(t);
  }, [burst]);
  const isNew = (m) => seen.current && seen.current.convId === active?.id && !seen.current.initial?.has(m.id) && Date.now() - new Date(m.at).getTime() < 4000;

  const convTitle = (conv) =>
    conv.group
      ? conv.name
      : `${conv.anonymous === false ? 'Chat' : 'Anonymous chat'} with ${conv.anonymous === false ? fullName(conv.memberIds.find((id) => id !== me) ?? '') : firstName(conv.memberIds.find((id) => id !== me) ?? '')}`;
  const submit = (text) => {
    const t = text.trim();
    if (!t || !active) return;
    send(active.id, t);
    setDraft('');
    setPicker(false);
  };

  return (
    <div className="chat-root flex h-full overflow-hidden bg-surface">
      <aside className="chat-aside flex w-48 shrink-0 flex-col border-r border-line">
        <div className="flex items-center justify-between p-4">
          <h1 className="font-bold">Chat</h1>
          <button
            aria-label="New chat"
            className="focus-ring rounded-lg p-1.5 hover:bg-surface-2"
            onClick={() => setCreating(true)}
          >
            <Plus size={18} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto px-2">
          {myConvs.map((conv) => {
            const last = msgs.filter((m) => m.convId === conv.id).at(-1);
            return (
              <li key={conv.id}>
                <button
                  onClick={() => setActiveId(conv.id)}
                  className={cx(
                    'focus-ring flex w-full items-center gap-3 rounded-xl p-2 text-left',
                    conv.id === active?.id && 'bg-accent-soft',
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lavender text-lavender-ink">
                    {conv.group ? <Users size={16} /> : conv.anonymous === false ? <Avatar id={conv.memberIds.find((id) => id !== me)} size="sm" /> : <VenetianMask size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{convTitle(conv)}</span>
                    <span className="block truncate text-xs text-muted">
                      {last ? (last.system ? last.text : `${last.from ? firstName(last.from) : last.alias}: ${last.text}`) : 'No messages yet'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line p-4">
          <div className="flex items-center justify-between gap-2">
            {renaming && active?.group ? (
              <form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={(e) => { e.preventDefault(); try { renameConv(active.id, nameDraft); setRenaming(false); } catch (err) { toast({ title: err.message, tone: 'info' }); } }}>
                <input autoFocus aria-label="Group name" className={cx(INPUT_CLASS, 'py-1')} value={nameDraft} maxLength={40} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(false); }} />
                <button type="submit" aria-label="Save group name" className="focus-ring rounded-lg p-1.5 text-accent-ink hover:bg-surface-2"><Check size={16} /></button>
              </form>
            ) : (
              <p className="truncate font-bold">{active ? convTitle(active) : 'Chat'}</p>
            )}
            {active?.group && !renaming && (
              <button aria-label="Edit group name" title="Rename the group (any member can)" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => { setNameDraft(active.name || ''); setRenaming(true); }}>
                <Pencil size={14} />
              </button>
            )}
            {active?.group && active.creator && (
              <button aria-label="Delete group" title="Delete the group for everyone (only you, its creator, can)" className="focus-ring rounded-lg p-1.5 text-coral-ink hover:bg-surface-2" onClick={() => setDeleting(true)}>
                <Trash2 size={15} />
              </button>
            )}
            {active && (
              <button
                aria-label="Leave chat"
                title="Leave chat"
                className="focus-ring ml-auto rounded-lg p-1.5 text-muted hover:bg-surface-2"
                onClick={() => setLeaving(true)}
              >
                <LogOut size={15} />
              </button>
            )}
            {onClose && (
              <button
                aria-label="Minimise chat"
                className="focus-ring rounded-lg px-2 text-lg leading-none text-muted hover:bg-surface-2"
                onClick={onClose}
              >
                -
              </button>
            )}
          </div>
          <p className="text-xs text-muted">
            {named
              ? 'Messages show your name. Chats disappear a day after the last message.'
              : '🎭 Anonymous: nobody, including management, can see who wrote what. Everyone is shown on the left, and names change every day. Chats disappear a day after the last message.'}
            {!named && (
              <button type="button" className="focus-ring ml-1 rounded px-1 font-semibold text-accent-ink underline" onClick={() => { setPeek(true); setTimeout(() => setPeek(false), 5000); }}>
                {peek ? `Today you are ${myAlias ?? 'given a new name when you write'}` : 'Show my name'}
              </button>
            )}
          </p>
        </header>
        <div className="chat-scroll relative flex-1 space-y-3 overflow-y-auto p-4">
          {burst && <Burst emojis={burst.emojis} burstKey={burst.k} />}
          {messages.length === 0 && <p className="chat-wave py-10 text-center text-sm text-muted">Say hello <span className="inline-block">👋</span></p>}
          {messages.map((m) => {
            if (m.system) return <p key={m.id} className="py-1 text-center text-xs text-muted">{m.text}</p>;
            const mine = isMine(m);
            const big = EMOJI_ONLY.test(String(m.text).trim());
            const sender = m.from ? fullName(m.from) : m.alias;
            // Named chats: my messages sit on the right. Anonymous chats: everyone, me included, looks the same and sits on the left,
            // so nobody glancing at my screen can tell which messages are mine (tap one of my own to get Delete).
            const right = mine && named;
            const showDelete = mine && (named || menuFor === m.id);
            return (
              <div key={m.id} className={cx('flex items-end gap-2', right && 'justify-end', isNew(m) && (right ? 'chat-in-right' : 'chat-in-left'))}>
                {m.from && !mine && <Avatar id={m.from} size="sm" />}
                <div
                  className={cx('max-w-[75%] px-3 py-2', big ? 'chat-big' : 'rounded-2xl', !big && (right ? 'bg-accent-soft chat-tail-right' : 'bg-surface-2 chat-tail-left'))}
                  onClick={mine && !named ? () => setMenuFor((cur) => (cur === m.id ? null : m.id)) : undefined}
                >
                  <p className={cx('flex items-center gap-1 text-xs font-semibold text-muted', right && 'justify-end')}>
                    {!(named && mine) && <span className={m.from ? 'text-ink' : ''}>{sender}</span>}
                    {!(named && mine) && ' · '}{timeAgo(m.at)}
                    {showDelete && (
                      <button
                        aria-label="Delete message"
                        className="focus-ring ml-1 rounded p-0.5 text-muted hover:text-ink"
                        onClick={(e) => { e.stopPropagation(); deleteMessage(m.id); setMenuFor(null); }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </p>
                  {big ? (
                    <p className="chat-big-row">{emojisOf(m.text).map((e, i) => <Emoji3D key={i} e={e} size="3rem" />)}</p>
                  ) : (
                    <p className="text-sm">{m.text}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        {active && (
          <div className="relative border-t border-line">
            {picker && (
              <div className="chat-picker" role="group" aria-label="Emojis">
                <div className="chat-picker-tabs" role="tablist">
                  {PICKER_TABS.map(([label], i) => (
                    <button key={label} type="button" role="tab" aria-selected={tab === i} className={cx('chat-picker-tab', tab === i && 'chat-picker-tab-on')} onClick={() => setTab(i)}>{label}</button>
                  ))}
                </div>
                <div className="chat-picker-grid" role="listbox">
                  {PICKER_TABS[tab][1].map((e) => (
                    <button key={e} type="button" role="option" aria-label={`Emoji ${e}`} className="chat-picker-item" onClick={() => setDraft((d) => d + e)} onDoubleClick={() => submit(e)} title="Click to add, double-click to send on its own">
                      <Emoji3D e={e} size="1.7rem" spin={false} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form
              className="flex items-center gap-2 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
            >
              <button type="button" aria-label="Pick an emoji" aria-expanded={picker} className="focus-ring rounded-xl p-2 text-muted hover:bg-surface-2" onClick={() => setPicker((v) => !v)}>
                <Smile size={20} />
              </button>
              <input
                className={INPUT_CLASS}
                placeholder={named ? 'Type a message' : 'Type an anonymous message'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={280}
              />
              <Button type="submit" className="chat-send"><span>Send</span><Send size={14} className="chat-plane" /></Button>
            </form>
          </div>
        )}
      </section>
      <ConfirmModal
        open={leaving}
        title="Leave this chat?"
        message="You will no longer see it or its messages. The others keep the conversation."
        confirmLabel="Leave"
        onClose={() => setLeaving(false)}
        onConfirm={() => active && leaveConv(active.id)}
      />
      <ConfirmModal
        open={deleting}
        title="Delete this group for everyone?"
        message="The group and all its messages disappear for every member. This cannot be undone."
        confirmLabel="Delete group"
        onClose={() => setDeleting(false)}
        onConfirm={() => { if (active) { try { deleteConv(active.id); } catch (err) { toast({ title: err.message, tone: 'info' }); } } }}
      />
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New chat"
        description="Pick one person for a private chat, or several to create a group."
        size="sm"
        footer={
          <Button
            disabled={!picked.length}
            onClick={() => {
              const isGroup = picked.length > 1;
              const id = createConv(isGroup ? groupName.trim() || 'New group' : '', [me, ...picked], isGroup, anon);
              setActiveId(id);
              setPicked([]);
              setGroupName('');
              setAnon(false);
              setCreating(false);
            }}
          >
            Start chat
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {PEOPLE.filter((p) => p.id !== me && p.role !== 'founder').map((p) => {
            const selected = picked.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setPicked((prev) => (selected ? prev.filter((id) => id !== p.id) : [...prev, p.id]))}
                className={cx(
                  'focus-ring flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm',
                  selected ? 'border-accent bg-accent-soft font-semibold' : 'border-line',
                )}
              >
                <Avatar id={p.id} size="sm" /> {fullName(p.id)}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
          <span><b>🎭 Anonymous</b><span className="block text-xs text-muted">Hide names: everyone gets a random alias that changes every day, and nobody (not even management) sees who wrote what. Off means real names.</span></span>
        </label>
        {picked.length > 1 && (
          <input
            className={cx(INPUT_CLASS, 'mt-3')}
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        )}
      </Modal>
    </div>
  );
}

export default AnonymousChat;
