export type MobileSettlement = {
  id: number;
  name: string;
  type: string;
};

export type MobileUser = {
  id: string;
  displayName: string;
  executiveId: number;
  departmentId: number | null;
  roleIds: number[];
  settlementIds: number[];
  // Optional so sessions saved before profile names were added still unlock.
  executiveName?: string | null;
  settlements?: MobileSettlement[];
};

export type Session = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  sessionExpiresAt: string;
  serverTime: string;
  receivedAtDevice: number;
  user: MobileUser;
};

export type StartLogin = { authorizationUrl: string; state: string; redirectUri: string };
export const REDIRECT_URI = 'evtas://auth/callback';
