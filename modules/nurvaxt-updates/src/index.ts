import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

export type PlayUpdateInfo = {
  status:
    | 'unavailable'
    | 'available'
    | 'pending'
    | 'downloading'
    | 'downloaded'
    | 'installing'
    | 'installed'
    | 'failed'
    | 'cancelled';
  versionCode: number;
  flexibleAllowed: boolean;
  bytesDownloaded: number;
  totalBytes: number;
};

declare class NurvaxtUpdates extends NativeModule<{
  onStateChange: (info: PlayUpdateInfo) => void;
}> {
  checkForUpdate(): Promise<PlayUpdateInfo>;
  startUpdate(): Promise<'accepted' | 'cancelled' | 'downloaded' | 'unavailable'>;
  completeUpdate(): Promise<void>;
}

export default requireOptionalNativeModule<NurvaxtUpdates>('NurvaxtUpdates');
