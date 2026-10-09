import { router } from 'expo-router';
import { apiRequest } from '../auth/api';

/** One of Tbu.Web's notifications; `createDate` comes formatted as the web shows it. */
/** The record a notification is about, opened in the app's review screen. */
export type NotificationTarget = { module: 'households' | 'temporary-residents'; reportId: number };
export type NotificationItem = { id: number; content: string; createDate: string; seen: boolean; target: NotificationTarget | null };
export type NotificationPage = { items: NotificationItem[]; unreadCount: number; pageNumber: number; pageSize: number; totalCount: number; totalPages: number };
type Count = { unreadCount: number };

export const notificationsApi = {
  page: (accessToken: string, pageNumber: number, pageSize: number) =>
    apiRequest<NotificationPage>('GET', `notifications?pageNumber=${pageNumber}&pageSize=${pageSize}`, { accessToken }),
  unreadCount: (accessToken: string) => apiRequest<Count>('GET', 'notifications/unread-count', { accessToken, timeoutMs: 10_000 }).then(x => x.unreadCount),
  markSeen: (accessToken: string, id: number) => apiRequest<Count>('POST', `notifications/${id}/seen`, { accessToken }).then(x => x.unreadCount),
};

/** Opens the app's review screen of a notification's record, as "Ətraflı bax" does from a server list. */
export const openTarget = (target: NotificationTarget) => target.module === 'households'
  ? router.push({ pathname: '/households/server/[reportId]', params: { reportId: String(target.reportId) } })
  : router.push({ pathname: '/temporary-residents/server/[reportId]', params: { reportId: String(target.reportId) } });
