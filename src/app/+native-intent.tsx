// Digital Login is completed by expo-web-browser. Do not route its one-time code into a screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes('auth/callback')) return '/';
  return path;
}
