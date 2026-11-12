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
  previewDefaultSound: () => 'playing' | 'silent' | 'muted' | 'unavailable';
  stopSoundPreview: () => void;
  isSoundPreviewPlaying: () => boolean;
  replacePlan: (json: string) => Promise<void>;
  replaceCountdownPlan: (json: string) => Promise<void>;
  replaceWidgetPlan: (json: string) => Promise<void>;
  requestPinWidget: (variant: 'large' | 'compact' | 'small') => Promise<boolean>;
  scheduleTest: () => Promise<void>;
  diagnostics: () => AlarmDiagnostics;
  requestExactAccess: () => void;
}>('NurvaxtAlarm');
