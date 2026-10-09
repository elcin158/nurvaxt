import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../App';
import { DetailPlaceholder } from '../components/DetailPlaceholder';
import { useResidents } from './context';
import { FormEditor } from './FormScreen';
import { StateBanner } from '../components/StateBanner';
import { getServerResident } from './server';
import type { ResidentDraft, ServerResidentDetail } from './types';

/** Tbu.Web's "Ətraflı bax": the server copy in the form's review mode. It is fetched on open and kept only in memory. */
export default function ServerDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>(), residents = useResidents(), auth = useAuth();
  const [detail, setDetail] = useState<ServerResidentDetail | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);
  useEffect(() => {
    if (!residents.online) return;
    let cancelled = false;
    void authRef.current.getAccessToken().then(token => getServerResident(token, Number(reportId)))
      .then(value => { if (!cancelled) setDetail(value); })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Qeyd yüklənmədi.'); });
    return () => { cancelled = true; };
  }, [reportId, residents.online, attempt]);
  const catalog = residents.catalog;
  const back = () => router.canGoBack() ? router.back() : router.replace('/temporary-residents');
  const message = !detail && (!residents.online ? 'Serverdəki qeydə baxmaq üçün internetə qoşulun.' : error)
    || (!catalog ? 'Məlumatları göstərmək üçün əvvəlcə arayışları onlayn yükləyin.' : '');
  const retry = () => { setError(''); setAttempt(x => x + 1); };
  if (residents.catalogLoading || message || !detail || !catalog) return <DetailPlaceholder title="Müvəqqəti yaşayan şəxs" attempt={attempt} onClose={back}
    loadingText={residents.catalogLoading ? 'Arayışlar yüklənir…' : 'Qeyd yüklənir…'} error={residents.online && !residents.catalogLoading ? error : ''}
    message={residents.catalogLoading || error ? '' : message} onRetry={residents.online ? retry : undefined} />;
  // A device-side stand-in for the form; its id matches no device record, so nothing is saved or released.
  const state = detail.state;
  const draft: ResidentDraft = { id: `server:${state.reportId}`, owner: '', revision: 0, syncedRevision: 0, createdAt: '', updatedAt: '', data: detail.data,
    server: { rootReportId: state.rootReportId, reportId: state.reportId, version: state.version, personalAccountNumber: detail.accountNumber } };
  return <FormEditor key={draft.id} initialDraft={draft} review={{ hint: `Serverdəki qeyd · yalnız baxış · ${state.statusName}`, onClose: back,
    banner: state.returnReason ? <StateBanner tone="warning" title={state.statusName} text={`Səbəb: ${state.returnReason}`} /> : null }} />;
}
