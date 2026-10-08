import CalmScene from '@/fun/CalmScene';
import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from './NotificationProvider';
import { Emoji, Rich } from '@/icons/Emoji';

export default function NotificationBell() {
  const { items, unread, latest, markAllRead, open } = useNotifications();
  const [ring, setRing] = useState(false);
  useEffect(() => {
    if (!latest) return undefined;
    setRing(true);
    const t = setTimeout(() => setRing(false), 900);
    return () => clearTimeout(t);
  }, [latest?.id]);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  const enableDesktop = async () => setPermission(await Notification.requestPermission());

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} className="relative p-2 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300 hover:text-white">
          <Bell className={`w-4 h-4 ${ring ? 'animate-wiggle' : ''}`} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-1.5rem)] p-0 bg-slate-900 border-slate-700 text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="font-semibold">Notifications</span>
          {unread > 0 && <button onClick={markAllRead} className="text-xs text-blue-400 hover:underline">Mark all read</button>}
        </div>
        {permission === 'default' && (
          <button onClick={enableDesktop} className="w-full text-left text-xs px-4 py-2 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20">
            Turn on desktop alerts so you're notified even when this tab is in the background
          </button>
        )}
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <CalmScene />}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => { setIsOpen(false); open(n); }}
              className={`w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800/70 ${n.read ? '' : 'bg-blue-500/5'}`}
            >
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                <div className="min-w-0">
                  <div className="text-sm font-medium"><Rich text={n.title} /></div>
                  {n.message && <div className="text-xs text-slate-300 mt-0.5 whitespace-pre-line line-clamp-3"><Rich text={n.message} /></div>}
                  <div className="text-[11px] text-slate-500 mt-1">{formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
