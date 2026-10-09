import { requireOptionalNativeModule } from 'expo-modules-core';
export type AlarmDiagnostics = {
  exact: boolean;
  count: number;
  queued: number;
  next: number | null;
  lastOperation: string | null;
  lastError: string | null;
  countdownActive: boolean;
  countdownError: string | null;
};
export default requireOptionalNativeModule<{
  replacePlan: (json: string) => Promise<void>;
  replaceCountdownPlan: (json: string) => Promise<void>;
  scheduleTest: () => Promise<void>;
  diagnostics: () => AlarmDiagnostics;
  requestExactAccess: () => void;
}>('NurvaxtAlarm');
