import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { fetchNotifications, markNotificationsRead } from "../../data/api";
import type { AppNotification } from "../../types";

const font = { fontFamily: 'var(--font-body)' } as const;

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/** Bell with an unread count and a list of the latest notifications. */
export function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    fetchNotifications().then(setItems).catch(() => {});
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const unread = items.filter(i => !i.read);

  function markAll() {
    const ids = unread.map(i => i.id);
    setItems(is => is.map(i => ({ ...i, read: true })));
    markNotificationsRead(ids).catch(load);
  }

  function openItem(n: AppNotification) {
    if (!n.read) {
      setItems(is => is.map(i => (i.id === n.id ? { ...i, read: true } : i)));
      markNotificationsRead([n.id]).catch(load);
    }
    setOpen(false);
    if (n.bubbleId) navigate(`/group/${n.bubbleId}`);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
        className="relative size-9 flex items-center justify-center rounded-lg text-[#4B5563] hover:text-[#212529] hover:bg-[#F8F9FA] transition-colors">
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {unread.length > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FA5252] text-white text-[10px] font-bold flex items-center justify-center"
            style={font}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-[#E9ECEF] overflow-hidden z-40"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F3F5]">
            <p className="text-[14px] font-bold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>Notifications</p>
            {unread.length > 0 && (
              <button onClick={markAll} className="text-[12px] font-semibold text-[#00a79d] hover:underline" style={font}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#6C757D]" style={font}>Nothing yet.</p>
            ) : items.map(n => (
              <button key={n.id} onClick={() => openItem(n)}
                className="w-full text-left px-4 py-3 border-b border-[#F8F9FA] last:border-0 hover:bg-[#F8F9FA] transition-colors flex gap-2.5">
                <span className={`mt-1.5 size-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#00a79d]'}`} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13px] text-[#212529] ${n.read ? '' : 'font-semibold'}`} style={font}>{n.message}</span>
                  <span className="block text-[11px] text-[#ADB5BD] mt-0.5" style={font}>{ago(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
