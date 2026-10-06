import type { HistoryItem, ServerResidentDetail, ServerResidentPage } from '../../src/temporary-residents/types';
import { formData } from './fixture';
export { fromServer } from '../../src/temporary-residents/server';
const items = Array.from({ length: 3 }, (_, i) => ({
  reportId: 900 + i, accountNumber: `0310${i}`, fullName: ['Sınaq Nümunə Test', 'Məmmədov Əli Vəli', ''][i], gender: i === 2 ? '' : 'Kişi',
  birthDate: i === 2 ? '' : '15.06.1990', permanentResidence: i === 2 ? '' : 'Bakı şəhəri', arrival: '', workflowStatus: ['Formalaşmış', 'Təsdiqdən geri qaytarılıb', 'Formalaşmış'][i],
}));
const wait = () => new Promise(resolve => setTimeout(resolve, 300));
export async function listServerResidents(_: string, search: string, pageNumber: number): Promise<ServerResidentPage> {
  await wait();
  const found = items.filter(x => `${x.fullName} ${x.accountNumber}`.toLocaleLowerCase('az-AZ').includes(search.toLocaleLowerCase('az-AZ')));
  return { items: found, pageNumber, totalCount: found.length, totalPages: 1 };
}
export async function getServerResident(_: string, reportId: number): Promise<ServerResidentDetail> {
  await wait();
  const returned = reportId === 901;
  return { accountNumber: `0310${reportId - 900}`, address: null, data: formData,
    state: { rootReportId: reportId, reportId, version: 3, status: returned ? 4 : 1, statusName: returned ? 'Təsdiqdən geri qaytarılıb' : 'Formalaşmış',
      canEdit: true, returnReason: returned ? 'Doğum tarixi düzəldilməlidir' : null },
    actions: { canEdit: true, canDelete: !returned, canSubmitForApproval: reportId === 900, canSubmitForApprovalWhenCompleted: true, canClose: false, closeRequiresDescription: false } };
}
export async function getHistory(): Promise<HistoryItem[]> {
  await wait();
  return [{ actionDate: '2026-10-05T10:00:00Z', action: 'Geri qaytarılma', previousStatus: 'Təsdiq gözləyir', newStatus: 'Təsdiqdən geri qaytarılıb', description: 'Doğum tarixi düzəldilməlidir', actorName: 'İcraçı' },
    { actionDate: '2026-10-04T09:00:00Z', action: 'Təsdiqə göndərilmə', previousStatus: 'Formalaşmış', newStatus: 'Təsdiq gözləyir', description: null, actorName: 'Operator' }];
}
