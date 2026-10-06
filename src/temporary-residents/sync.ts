import { ApiConnectionError, ApiError } from '../auth/api';
import type { ResidentStore } from './store';
import { pending, type ResidentDraft, type ServerResidentDetail, type SyncReceipt } from './types';
import { fromServer } from './server';

export class ResidentSync {
  private running = false;
  constructor(private store: ResidentStore, private send: (draft: ResidentDraft) => Promise<SyncReceipt>,
    private check: (draft: ResidentDraft) => string | undefined) {}
  async selected(ids: string[], onProgress: (done: number, total: number) => void = () => {},
    active: () => boolean = () => true) {
    if (this.running) throw new Error('Sinxronizasiya artıq davam edir.');
    this.running = true;
    let succeeded = 0, failed = 0, conflicts = 0;
    const selected = [...new Set(ids)].map(id => this.store.get(id)).filter((d): d is ResidentDraft => !!d && pending(d) && !d.deleted);
    try {
      for (const draft of selected) {
        if (!active()) break;
        try {
          const error = this.check(draft);
          if (error) throw new Error(error);
          const receipt = await this.send(draft);
          // A receipt is persisted even if the screen locks during the network call.
          this.store.acknowledge(draft, receipt); succeeded++;
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : 'Sinxronizasiya tamamlanmadı.';
          // The server refused without writing anything; the operator decides, other records go on.
          if (cause instanceof ApiError && cause.status === 409 && (cause.code === 'VERSION_CONFLICT' || cause.code === 'REPORT_LOCKED') && cause.problem?.server) {
            const server = cause.problem.server as ServerResidentDetail;
            this.store.conflict(draft.id, { code: cause.code, message, server: { ...server, data: fromServer(server.data) }, at: new Date().toISOString() });
            conflicts++; failed++; onProgress(succeeded + failed, selected.length); continue;
          }
          if (cause instanceof ApiError && cause.status === 410) this.store.markDeleted(draft.id, message);
          else this.store.fail(draft.id, message);
          failed++;
          if (cause instanceof ApiConnectionError || cause instanceof ApiError && [401, 403, 429, 503].includes(cause.status)) break;
        }
        onProgress(succeeded + failed, selected.length);
      }
      return { succeeded, failed, conflicts, remaining: selected.length - succeeded };
    } finally { this.running = false; }
  }
}
