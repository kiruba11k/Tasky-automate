import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Users, VenetianMask } from 'lucide-react';
import { Se as useStore, Qe as PEOPLE, Ya as Modal, be as firstName, nt as fullName } from '@/internal/min';
import { cx } from '@/internal/ui/cx';
import { Button } from '@/internal/ui/Button';
import { Avatar } from '@/internal/ui/Avatar';
import { INPUT_CLASS, timeAgo } from '@/internal/ui/format';

/** Anonymous chat panel shown in the floating chat popup (original: `tue`). */
export function AnonymousChat({ onClose }) {
  const { me, convs, msgs, aliases, send, createConv } = useStore();
  const myConvs = useMemo(() => convs.filter((c) => c.memberIds.includes(me)), [convs, me]);
  const [activeId, setActiveId] = useState(myConvs[0]?.id);
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [picked, setPicked] = useState([]);
  const [groupName, setGroupName] = useState('');
  const active = myConvs.find((c) => c.id === activeId) ?? myConvs[0];
  const messages = msgs.filter((m) => m.convId === active?.id);
  const myAlias = active ? aliases[`${me}:${active.id}`] : undefined;
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages.length, active?.id]);

  const convTitle = (conv) =>
    conv.group
      ? conv.name
      : `Anonymous chat with ${firstName(conv.memberIds.find((id) => id !== me) ?? '')}`;

  return (
    <div className="flex h-full overflow-hidden bg-surface">
      <aside className="flex w-48 shrink-0 flex-col border-r border-line">
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
                    {conv.group ? <Users size={16} /> : <VenetianMask size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{convTitle(conv)}</span>
                    <span className="block truncate text-xs text-muted">
                      {last ? `${last.alias}: ${last.text}` : 'No messages yet'}
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
            <p className="truncate font-bold">{active ? convTitle(active) : 'Chat'}</p>
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
            {'🎭 Anonymous: nobody, including management, can see who wrote what.'}
            {myAlias && ` You appear as ${myAlias}.`}
          </p>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Say hello 👋</p>}
          {messages.map((m) => {
            const mine = m.alias === myAlias;
            return (
              <div key={m.id} className={cx('flex', mine && 'justify-end')}>
                <div className={cx('max-w-[75%] rounded-2xl px-3 py-2', mine ? 'bg-accent-soft' : 'bg-surface-2')}>
                  <p className="text-xs font-semibold text-muted">
                    {m.alias} · {timeAgo(m.at)}
                  </p>
                  <p className="text-sm">{m.text}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        {active && (
          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) {
                send(active.id, draft.trim());
                setDraft('');
              }
            }}
          >
            <input
              className={INPUT_CLASS}
              placeholder="Type an anonymous message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={280}
            />
            <Button type="submit">Send</Button>
          </form>
        )}
      </section>
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New anonymous chat"
        description="Pick one person for a private chat, or several to create a group."
        size="sm"
        footer={
          <Button
            disabled={!picked.length}
            onClick={() => {
              const isGroup = picked.length > 1;
              const id = createConv(isGroup ? groupName.trim() || 'New group' : '', [me, ...picked], isGroup);
              setActiveId(id);
              setPicked([]);
              setGroupName('');
              setCreating(false);
            }}
          >
            Start chat
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {PEOPLE.filter((p) => p.id !== me).map((p) => {
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
