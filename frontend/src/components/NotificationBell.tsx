import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { NotificationItem, NotificationType, notificationService } from '../services/notificationService';

interface NotificationMeta {
  label: string;
  icon: React.ReactNode;
  iconClasses: string;
}

const notificationMeta: Record<NotificationType, NotificationMeta> = {
  menu_item_created: {
    label: 'Menu',
    iconClasses: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
      </svg>
    )
  },
  menu_item_updated: {
    label: 'Menu',
    iconClasses: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-8.5a2.121 2.121 0 013 3L12 16l-4 1 1-4 8.5-8.5z" />
      </svg>
    )
  },
  menu_item_deleted: {
    label: 'Menu',
    iconClasses: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m3 0V5a1 1 0 011-1h6a1 1 0 011 1v2M4 7h16" />
      </svg>
    )
  },
  availability_changed: {
    label: 'Availability',
    iconClasses: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.5 9A8 8 0 0119 7m-.5 8A8 8 0 015 17" />
      </svg>
    )
  },
  staff_invited: {
    label: 'Team',
    iconClasses: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-1a4 4 0 00-5-3.9M9 20H2v-1a6 6 0 1112 0v1H9zm0 0v0M9 7a4 4 0 110 8 4 4 0 010-8zm7-2v6m3-3h-6" />
      </svg>
    )
  },
  staff_updated: {
    label: 'Team',
    iconClasses: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0H5z" />
      </svg>
    )
  },
  staff_deleted: {
    label: 'Team',
    iconClasses: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0111-5.7M21 21l-5-5m0 5l5-5" />
      </svg>
    )
  },
  invitation_accepted: {
    label: 'Team',
    iconClasses: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }
};

const formatTimeAgo = (dateString: string): string => {
  const created = new Date(dateString).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - created) / 1000));

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  }

  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `${days}d ago`;

  return new Date(dateString).toLocaleDateString();
};

const getDayLabel = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfDate) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'Earlier';
};

const NOTIFICATIONS_MUTED_KEY = 'notificationsMuted';

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (sharedAudioContext) return sharedAudioContext;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  sharedAudioContext = new Ctx();
  return sharedAudioContext;
};

const playNotificationSound = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
};

const unlockAudioOnInteraction = () => {
  const ctx = getAudioContext();
  if (ctx?.state === 'suspended') ctx.resume();
};

const getActorName = (item: NotificationItem): string => {
  if (typeof item.createdBy === 'string') return '';
  return item.createdBy?.name || item.createdBy?.email || '';
};

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem(NOTIFICATIONS_MUTED_KEY) === 'true');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const prevUnreadRef = useRef<number>(0);
  const isFirstFetch = useRef(true);

  const fetchNotifications = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [list, unread] = await Promise.all([
        notificationService.getNotifications(),
        notificationService.getUnreadCount()
      ]);
      const prevUnread = prevUnreadRef.current;
      prevUnreadRef.current = unread;

      if (!isFirstFetch.current && unread > prevUnread && prevUnread >= 0) {
        const latest = list.find((n) => !n.isRead) || list[0];
        const isMuted = localStorage.getItem(NOTIFICATIONS_MUTED_KEY) === 'true';
        if (latest && !isMuted) {
          void playNotificationSound();
        }
        if (latest) {
          toast((t) => (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-gray-900 dark:text-white">{latest.title}</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{latest.message}</span>
            </div>
          ), { duration: 4000 });
        }
      }
      isFirstFetch.current = false;
      setNotifications(list);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    const onMuteChange = (e: CustomEvent<{ muted: boolean }>) => setMuted(e.detail?.muted ?? false);
    window.addEventListener('notificationsMutedChanged', onMuteChange as EventListener);
    return () => window.removeEventListener('notificationsMutedChanged', onMuteChange as EventListener);
  }, []);

  useEffect(() => {
    fetchNotifications(true);
    const interval = window.setInterval(() => fetchNotifications(false), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) setOpen(false);
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const unreadItems = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );
  const groupedNotifications = useMemo(() => {
    const grouped: Record<string, NotificationItem[]> = { Today: [], Yesterday: [], Earlier: [] };
    notifications.forEach((item) => {
      grouped[getDayLabel(item.createdAt)].push(item);
    });
    return (['Today', 'Yesterday', 'Earlier'] as const)
      .filter((key) => grouped[key].length > 0)
      .map((key) => ({ label: key, items: grouped[key] }));
  }, [notifications]);

  const displayedUnreadCount = unreadCount || unreadItems;

  const handleMarkAllRead = async () => {
    if (markingRead || displayedUnreadCount === 0) return;
    setMarkingRead(true);
    try {
      const updated = await notificationService.markAllRead();
      if (updated > 0) {
        toast.success('All notifications marked as read');
      }
      await fetchNotifications(false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Could not mark notifications as read');
    } finally {
      setMarkingRead(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          unlockAudioOnInteraction();
          setOpen((prev) => !prev);
        }}
        className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        aria-label="Open notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {displayedUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[11px] font-semibold rounded-full flex items-center justify-center">
            {displayedUnreadCount > 99 ? '99+' : displayedUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {displayedUnreadCount > 0 ? `${displayedUnreadCount} unread update${displayedUnreadCount > 1 ? 's' : ''}` : 'You are all caught up'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { unlockAudioOnInteraction(); void playNotificationSound(); }}
                className="text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                title="Test notification sound"
              >
                Test sound
              </button>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingRead || displayedUnreadCount === 0}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {markingRead ? 'Marking...' : 'Mark all read'}
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/20">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading notifications...</div>
            ) : groupedNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No notifications yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">New menu and team updates will appear here</p>
              </div>
            ) : (
              groupedNotifications.map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 z-10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur">
                    {group.label}
                  </div>
                  <div className="px-2 py-2 space-y-2">
                    {group.items.map((item) => {
                      const meta = notificationMeta[item.type];
                      const actorName = getActorName(item);
                      return (
                        <div
                          key={item._id}
                          className={`rounded-lg border transition p-3 ${
                            item.isRead
                              ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                              : 'bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-700/60 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta?.iconClasses || 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {meta?.icon || (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                                </svg>
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                                {!item.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 break-words">{item.message}</p>
                              <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{meta?.label || 'Update'}</span>
                                <span>{actorName ? `By ${actorName}` : 'System'}</span>
                                <span>•</span>
                                <span>{formatTimeAgo(item.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
