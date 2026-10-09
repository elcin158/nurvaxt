import { REDIRECT_URI, type MobileUser, type Session, type StartLogin } from './types';

export class ApiError extends Error {
  /** `code` and `problem` carry the server's ProblemDetails, e.g. a conflict with the server copy. */
  constructor(public status: number, message: string, public code?: string, public problem?: Record<string, unknown>) { super(message); }
}

export class ApiConnectionError extends Error {
  constructor(public timedOut: boolean) {
    super(timedOut ? 'Server cavab vermədi. Yenidən cəhd edin.' : 'Serverə qoşulmaq mümkün olmadı.');
  }
}

function baseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  // Plain HTTP is only for the local API in debug builds; release builds require HTTPS.
  if (!value.startsWith('https://') && !(__DEV__ && value.startsWith('http://')))
    throw new ApiError(0, 'Mobil API üçün HTTPS ünvanı konfiqurasiya edilməyib.');
  return value;
}

/** `text: true` returns the body unparsed, for a payload that is handed on rather than read. */
export async function apiRequest<T>(method: 'GET' | 'POST', path: string, {
  body, accessToken, timeoutMs = 20_000, text = false,
}: { body?: object; accessToken?: string; timeoutMs?: number; text?: boolean }): Promise<T> {
  const url = `${baseUrl()}/api/v1/${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method, headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
      });
    } catch (cause) {
      if (__DEV__) console.warn(`[api] ${method} ${url} → bağlantı xətası`, cause);
      throw new ApiConnectionError(controller.signal.aborted);
    }
    // Debug builds only; bodies carry codes and tokens, so only the URL and status are logged.
    if (__DEV__) console.log(`[api] ${method} ${url} → ${response.status} (${Date.now() - startedAt} ms)`);
    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      const details = problem?.errors && typeof problem.errors === 'object'
        ? Object.values(problem.errors).flat().filter((value): value is string => typeof value === 'string').join('\n') : '';
      throw new ApiError(response.status, details || problem?.title || 'Sorğu tamamlanmadı. Yenidən cəhd edin.',
        typeof problem?.code === 'string' ? problem.code : undefined, problem ?? undefined);
    }
    return response.status === 204 ? undefined as T : text ? await response.text() as T : await response.json() as T;
  } catch (cause) {
    // A known HTTP rejection stays authoritative even if its error body stalls.
    if (cause instanceof ApiError) throw cause;
    // Abort can also happen while reading the response body. React Native may
    // report cancellation as a plain Error rather than an AbortError.
    if (controller.signal.aborted) throw new ApiConnectionError(true);
    throw cause;
  } finally { clearTimeout(timer); }
}

const post = <T>(path: string, body: object, timeoutMs = 20_000) =>
  apiRequest<T>('POST', `auth/${path}`, { body, timeoutMs });

export const api = {
  start: (codeChallenge: string) => post<StartLogin>('digital-login/start', { codeChallenge }),
  exchange: (code: string, state: string, codeVerifier: string) =>
    post<Session>('digital-login/exchange', { code, state, codeVerifier }).then(stampSession),
  // A valid local session can open offline; don't hold PIN unlock for 20s.
  refresh: (refreshToken: string) => post<Session>('refresh', { refreshToken }, 3_000).then(stampSession),
  me: (accessToken: string) => apiRequest<MobileUser>('GET', 'auth/me', { accessToken, timeoutMs: 3_000 }),
  logout: (refreshToken: string) => post<void>('logout', { refreshToken }),
};

function stampSession(value: Session): Session { return { ...value, receivedAtDevice: Date.now() }; }

export function parseCallback(url: string, expectedState: string): string {
  const parsed = new URL(url);
  if (`${parsed.protocol}//${parsed.host}${parsed.pathname}` !== REDIRECT_URI ||
    parsed.hash || parsed.searchParams.getAll('state').length !== 1 ||
    parsed.searchParams.get('state') !== expectedState)
    throw new Error('Giriş cavabı uyğun deyil. Yenidən daxil olun.');
  if (parsed.searchParams.has('error')) throw new Error('Digital Login girişi tamamlanmadı.');
  const code = parsed.searchParams.get('code');
  if (!code || parsed.searchParams.getAll('code').length !== 1)
    throw new Error('Digital Login kodu alınmadı.');
  return code;
}
