import type { ReactNode } from 'react';
import type { NotificationPage } from '../../src/notifications/api';

// The preview's notifications: three on the server, two unread, as the bell and the list see them.
const items = [
  { id: 3, content: 'Hörmətli Əliyev Əli, 2026-cı il üzrə 1245 nömrəli təsərrüfat icraçı tərəfindən geri qaytarıldı: üzvlərin məlumatlarını yoxlayın.', createDate: '09.10.2026 10:42', seen: false, target: { module: 'households' as const, reportId: 1245 } },
  { id: 2, content: 'Müvəqqəti yaşayan şəxs üzrə 318 nömrəli hesabat təsdiq edildi.', createDate: '08.10.2026 16:05', seen: false, target: { module: 'temporary-residents' as const, reportId: 318 } },
  { id: 1, content: 'Arayışlar yeniləndi.', createDate: '01.10.2026 09:00', seen: true, target: null },
];
export function useNotifications() {
  return {
    online: true, unread: items.filter(x => !x.seen).length,
    page: async (pageNumber: number, pageSize: number): Promise<NotificationPage> => ({ items: items.slice(0, pageSize), unreadCount: 2, pageNumber, pageSize, totalCount: items.length, totalPages: 1 }),
    markSeen: async () => 1,
  };
}
export function NotificationProvider({ children }: { children: ReactNode }) { return children; }
