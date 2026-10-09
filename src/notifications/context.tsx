import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../App';
import { useReference } from '../reference/context';
import { notificationsApi, type NotificationPage } from './api';

// Tbu.Web's notifications live only on the server: nothing is kept on the device, and every part
// of them (the bell's count, the panel, the list) works only while the device is online.
type Context = {
  online: boolean;
  /** Unread notifications on the server; null until first read, and while offline. */
  unread: number | null;
  page(pageNumber: number, pageSize: number): Promise<NotificationPage>;
  /** Marks one read and returns the refreshed unread count. */
  markSeen(id: number): Promise<number>;
};
const NotificationContext = createContext<Context | null>(null);
// The bell's count is asked for this often while the app is in front and online.
const POLL_MS = 60_000;

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('Notification provider missing');
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(), { online } = useReference();
  const [unread, setUnread] = useState<number | null>(null);
  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);
  const token = useCallback(() => authRef.current.getAccessToken(), []);
  const active = auth.authenticated && online;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    // A failed read keeps the last count: the bell should not flicker on one slow request.
    const refresh = () => void token().then(notificationsApi.unreadCount)
      .then(count => { if (!cancelled) setUnread(count); }, () => undefined);
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, POLL_MS);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    // The count is dropped on going offline or signing out, so another account never sees it.
    return () => { cancelled = true; clearInterval(timer); foreground.remove(); setUnread(null); };
  }, [active, token]);

  const page = useCallback(async (pageNumber: number, pageSize: number) => {
    const result = await notificationsApi.page(await token(), pageNumber, pageSize);
    setUnread(result.unreadCount);
    return result;
  }, [token]);
  const markSeen = useCallback(async (id: number) => {
    const count = await notificationsApi.markSeen(await token(), id);
    setUnread(count);
    return count;
  }, [token]);

  return <NotificationContext.Provider value={{ online: active, unread: active ? unread : null, page, markSeen }}>{children}</NotificationContext.Provider>;
}
