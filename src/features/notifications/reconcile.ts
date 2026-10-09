import { reconciliationDiff, type PendingNotification, type PlannedNotification } from './domain';
export interface NotificationAdapter {
  pending(): Promise<PendingNotification[]>;
  cancel(id: string): Promise<void>;
  schedule(event: PlannedNotification): Promise<void>;
}
export async function reconcile(adapter: NotificationAdapter, desired: PlannedNotification[]) {
  const diff = reconciliationDiff(await adapter.pending(), desired);
  // Remove changed or stale requests before adding, keeping the native pending queue bounded.
  for (const id of new Set(diff.cancel)) await adapter.cancel(id);
  for (const event of diff.schedule) await adapter.schedule(event);
  return {
    cancelled: diff.cancel.length,
    scheduled: diff.schedule.length,
    pending: desired.length,
  };
}
