import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getNetworkStateAsync } from 'expo-network';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { api, ApiConnectionError, ApiError, parseCallback } from './src/auth/api';
import { vault } from './src/auth/deviceStore';
import { VaultError } from './src/auth/vault';
import { REDIRECT_URI, type Session } from './src/auth/types';

WebBrowser.maybeCompleteAuthSession();
// Read from the installed binary, not app config, so support sees the build actually on the device.
const versionLabel = [Application.nativeApplicationVersion, Application.nativeBuildVersion && `(${Application.nativeBuildVersion})`].filter(Boolean).join(' ');
type Phase = 'loading' | 'login' | 'setup' | 'locked' | 'home';

type AuthContextValue = {
  session: Session | null; authenticated: boolean; screen: ReactNode;
  getAccessToken: () => Promise<string>; lock(): void; logout(): Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Auth provider missing');
  return value;
}
function AuthApp({ children }: { children: ReactNode }) {
  usePreventScreenCapture();
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);
  const [obscured, setObscured] = useState(false);
  const refreshInFlight = useRef<Promise<string> | null>(null);
  const sessionRef = useRef(session); sessionRef.current = session;
  const phaseRef = useRef(phase), epoch = useRef(0), running = useRef(false);
  phaseRef.current = phase;

  useEffect(() => {
    void (async () => {
      try {
        const exists = await vault.exists();
        setBiometric(exists && await vault.biometricsEnabled());
        setCanBiometric(await LocalAuthentication.hasHardwareAsync() &&
          await LocalAuthentication.isEnrolledAsync() && SecureStore.canUseBiometricAuthentication());
        setPhase(exists ? 'locked' : 'login');
      } catch { setPhase('login'); setError('Sessiya oxunmadı. Digital Login ilə daxil olun.'); }
    })();
    const listener = AppState.addEventListener('change', (state) => {
      setObscured(state !== 'active');
      if (state !== 'background' || phaseRef.current === 'login' || phaseRef.current === 'loading') return;
      epoch.current++; vault.lock();
      setPin(''); setConfirmation(''); setError(''); setSession(null);
      setPhase(phaseRef.current === 'setup' ? 'login' : 'locked');
    });
    return () => { listener.remove(); vault.lock(); };
  }, []);

  useEffect(() => {
    if (phase !== 'home') return;
    const timer = setInterval(() => {
      if (running.current) return;
      const currentEpoch = epoch.current;
      void vault.assertSessionValid().catch(() => {
        if (currentEpoch !== epoch.current) return;
        epoch.current++; setSession(null); setPhase('login');
        setError('Sessiyanın vaxtı bitib. Digital Login ilə yenidən daxil olun.');
      });
    }, 15_000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'home' || !session || offline ||
      (session.user.executiveName !== undefined && session.user.settlements !== undefined)) return;
    // Older saved profiles lack names. Fetch them after Home opens so PIN unlock
    // stays fast, then keep the complete profile in the encrypted offline session.
    const currentEpoch = epoch.current;
    let cancelled = false;
    void (async () => {
      try {
        const user = await api.me(session.accessToken);
        if (cancelled || currentEpoch !== epoch.current || user.id !== session.user.id ||
          user.executiveName === undefined || user.settlements === undefined) return;
        const updated = { ...session, user };
        await vault.update(updated);
        if (!cancelled && currentEpoch === epoch.current) setSession(updated);
      } catch {
        if (!cancelled && currentEpoch === epoch.current)
          setError('Profil adları yenilənmədi. Tətbiqi kilidləyib yenidən açın.');
      }
    })();
    return () => { cancelled = true; };
  }, [phase, session, offline]);

  async function perform(action: (currentEpoch: number) => Promise<void>) {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    const currentEpoch = epoch.current;
    try { await action(currentEpoch); }
    catch (cause) {
      if (currentEpoch !== epoch.current) return;
      if ((cause instanceof VaultError && cause.code === 'REAUTH_REQUIRED') ||
        (cause instanceof ApiError && [401, 403].includes(cause.status))) {
        await vault.clear(); setSession(null); setPhase('login'); setBiometric(false);
      }
      setError(cause instanceof Error ? cause.message : 'Əməliyyatı tamamlamaq mümkün olmadı.'); setPin('');
    } finally { running.current = false; setBusy(false); }
  }

  async function login() {
    await perform(async (currentEpoch) => {
      const verifier = Array.from(Crypto.getRandomBytes(32), b => b.toString(16).padStart(2, '0')).join('');
      const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier,
        { encoding: Crypto.CryptoEncoding.BASE64 });
      const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const start = await api.start(challenge);
      if (start.redirectUri !== REDIRECT_URI) throw new Error('Digital Login qayıdış ünvanı uyğun deyil.');
      const result = await WebBrowser.openAuthSessionAsync(start.authorizationUrl, REDIRECT_URI);
      if (result.type !== 'success') return;
      const authenticated = await api.exchange(parseCallback(result.url, start.state), start.state, verifier);
      if (currentEpoch !== epoch.current) return;
      setSession(authenticated); setPin(''); setConfirmation(''); setOffline(false); setPhase('setup');
    });
  }

  async function setup() {
    await perform(async (currentEpoch) => {
      if (!session) return;
      if (pin !== confirmation) throw new Error('PIN kodları eyni deyil.');
      await vault.setup(session, pin);
      if (currentEpoch !== epoch.current) { vault.lock(); return; }
      setPin(''); setConfirmation(''); setBiometric(false); setPhase('home');
    });
  }

  async function unlock(useBiometric: boolean) {
    await perform(async (currentEpoch) => {
      const local = useBiometric ? await vault.unlockBiometric() : await vault.unlockPin(pin);
      if (currentEpoch !== epoch.current) { vault.lock(); return; }
      // Offline the refresh cannot succeed, so the local session opens without a request.
      const network = await getNetworkStateAsync().catch(() => null);
      let restored = local, isOffline = network?.isConnected === false || network?.isInternetReachable === false;
      if (isOffline) await vault.assertSessionValid();
      else try { restored = await api.refresh(local.refreshToken); }
      catch (cause) {
        const unavailable = cause instanceof ApiConnectionError || cause instanceof TypeError ||
          (cause instanceof Error && cause.name === 'AbortError') ||
          (cause instanceof ApiError && (cause.status >= 500 || cause.status === 429));
        if (!unavailable) throw cause;
        await vault.assertSessionValid(); isOffline = true;
      }
      if (!isOffline) await vault.update(restored);
      if (currentEpoch !== epoch.current) { vault.lock(); return; }
      setSession(restored); setOffline(isOffline); setPin(''); setPhase('home');
    });
  }

  async function enableBiometric() {
    await perform(async () => {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Biometrik girişi aktiv edin',
        cancelLabel: 'Ləğv et', disableDeviceFallback: true, biometricsSecurityLevel: 'strong' });
      if (!result.success) return;
      await vault.enableBiometrics(); setBiometric(true);
    });
  }

  async function logout() {
    await perform(async () => {
      let revoked = true;
      try { if (session) await api.logout(session.refreshToken); } catch { revoked = false; }
      await vault.clear(); epoch.current++;
      setSession(null); setBiometric(false); setPhase('login'); setPin(''); setConfirmation('');
      if (!revoked) setError('Cihazdan çıxış edildi. Serverdə sessiyanın bağlanması təsdiqlənmədi.');
    });
  }

  const lock = () => { epoch.current++; vault.lock(); setSession(null); setPin(''); setError(''); setPhase('locked'); };
  const reset = () => perform(async () => {
    await vault.clear(); epoch.current++; setSession(null); setBiometric(false); setPhase('login'); setPin('');
  });

  async function getAccessToken(): Promise<string> {
    const current = sessionRef.current;
    if (!current || phaseRef.current !== 'home') throw new Error('Davam etmək üçün tətbiqi açın.');
    const currentEpoch = epoch.current;
    await vault.assertSessionValid();
    if (currentEpoch !== epoch.current) throw new Error('Tətbiq kilidlənib.');
    if (new Date(current.accessTokenExpiresAt).getTime() > Date.now() + 30_000) return current.accessToken;
    const network = await getNetworkStateAsync().catch(() => null);
    if (network?.isConnected === false || network?.isInternetReachable === false) throw new ApiConnectionError(false);
    if (!refreshInFlight.current) {
      refreshInFlight.current = (async () => {
        try {
          const updated = await api.refresh(current.refreshToken);
          if (currentEpoch !== epoch.current) throw new Error('Tətbiq kilidlənib.');
          await vault.update(updated);
          if (currentEpoch !== epoch.current) throw new Error('Tətbiq kilidlənib.');
          sessionRef.current = updated; setSession(updated); setOffline(false);
          return updated.accessToken;
        } catch (cause) {
          if (cause instanceof ApiError && [401, 403].includes(cause.status) && currentEpoch === epoch.current) {
            await vault.clear(); setSession(null); setPhase('login');
            setError('Sessiya bitib. Digital Login ilə yenidən daxil olun.');
          }
          throw cause;
        } finally { refreshInFlight.current = null; }
      })();
    }
    return refreshInFlight.current;
  }

  // The sign-in card follows Tbu.Web's login page: logo, system name, Digital Login, agency footer.
  const screen = <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image source={require('./assets/rih-login.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="RİHİS loqosu" />
          <Text style={styles.system}>Rəqəmsal İcra Hakimiyyətləri{'\n'}İnformasiya Sistemi</Text>
          <Text style={styles.module}>Təsərrüfatların uçotu</Text>
          <View style={styles.divider} />
          {phase !== 'login' && phase !== 'loading' && <Text style={styles.title}>{phase === 'setup' ? 'PIN yaradın' : phase === 'locked' ? 'Yenidən xoş gördük' :
            `Salam, ${session?.user.displayName ?? ''}`}</Text>}
          {(phase === 'setup' || phase === 'locked') && <Text style={styles.subtitle}>{phase === 'setup' ? 'Bu planşetdə tətbiqi açmaq üçün 4 rəqəmli PIN təyin edin.' :
            'Davam etmək üçün PIN və ya biometrik girişdən istifadə edin.'}</Text>}
          {phase === 'loading' && <ActivityIndicator size="large" color={blue} style={styles.loader} />}
          {phase === 'login' && <>
            <Pressable accessibilityRole="button" accessibilityLabel="Digital Login ilə daxil ol" accessibilityState={{ disabled: busy }} onPress={login} disabled={busy}
              style={({ pressed }) => [styles.sso, pressed && styles.ssoPressed, busy && styles.dim]}>
              <Image source={require('./assets/digital-login.jpg')} style={styles.ssoImage} resizeMode="contain" />
            </Pressable>
            <Text style={styles.hint}>Sistemə daxil olmaq üçün MyGovID hesabınızdan istifadə edin.</Text>
            <Text style={styles.hint}>İlk giriş üçün internet lazımdır. Sonrakı açılışlarda PIN və ya biometrika ilə internetsiz daxil olacaqsınız.</Text>
          </>}
          {(phase === 'locked' || phase === 'setup') && <View style={styles.form}>
            <Text style={styles.label}>4 rəqəmli PIN</Text>
            <TextInput value={pin} onChangeText={v => setPin(v.replace(/\D/g, '').slice(0, 4))}
              secureTextEntry keyboardType="number-pad" maxLength={4} style={styles.pin} placeholder="••••"
              placeholderTextColor="#9AA6B5" editable={!busy} autoComplete="off" accessibilityLabel="4 rəqəmli PIN" />
            {phase === 'setup' && <><Text style={styles.label}>PIN-i təkrarlayın</Text>
              <TextInput value={confirmation} onChangeText={v => setConfirmation(v.replace(/\D/g, '').slice(0, 4))}
                secureTextEntry keyboardType="number-pad" maxLength={4} style={styles.pin} placeholder="••••"
                placeholderTextColor="#9AA6B5" editable={!busy} autoComplete="off" accessibilityLabel="PIN-i təkrarlayın" /></>}
            <Action label={phase === 'setup' ? 'PIN-i yadda saxla' : 'PIN ilə aç'} onPress={phase === 'setup' ? setup : () => unlock(false)}
              disabled={busy || pin.length !== 4 || (phase === 'setup' && confirmation.length !== 4)} />
            {phase === 'locked' && biometric && <Action secondary label="Biometrika ilə aç" onPress={() => unlock(true)} disabled={busy} />}
            {phase === 'locked' && <Pressable onPress={reset} disabled={busy}><Text style={styles.link}>PIN-i unutmusunuz? Digital Login ilə daxil olun</Text></Pressable>}
          </View>}
          {phase === 'home' && session && <View style={styles.form}>
            <View style={[styles.badge, offline && styles.offlineBadge]}><View style={[styles.dot, offline && styles.offlineDot]} />
              <Text style={styles.badgeText}>{offline ? 'Offline rejim · lokal giriş' : 'Hesab təsdiqlənib'}</Text></View>
            <View style={styles.details}>
              <Detail label="İcra hakimiyyəti" value={session.user.executiveName || 'İcra adı hələ yüklənməyib'} />
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>Təyin olunmuş İƏD / SİƏD</Text>
                {session.user.settlements?.length ? session.user.settlements.map(settlement =>
                  <View key={settlement.id} style={styles.settlement}>
                    <Text style={styles.detailValue}>{settlement.name}</Text>
                    {!settlement.name.trim().toLocaleLowerCase('az-AZ').endsWith(` ${settlement.type.trim().toLocaleLowerCase('az-AZ')}`) &&
                      <Text style={styles.detailLabel}>{settlement.type.toLocaleUpperCase('az-AZ')}</Text>}
                  </View>) : <Text style={styles.detailValue}>{session.user.settlementIds.length
                    ? 'Ərazi adları hələ yüklənməyib' : 'Ərazi təyin edilməyib'}</Text>}
              </View>
              <Detail label="Giriş yadda saxlanılır" value={new Date(session.sessionExpiresAt).toLocaleString('az-AZ')} />
            </View>
            {canBiometric && !biometric && <Action secondary label="Biometrik girişi aktiv et" onPress={enableBiometric} disabled={busy} />}
            {biometric && <Text style={styles.biometricNote}>Biometrik giriş aktivdir</Text>}
            <Action label="Tətbiqi kilidlə" onPress={lock} disabled={busy} />
            <Pressable onPress={logout} disabled={busy}><Text style={styles.link}>Hesabdan çıx</Text></Pressable>
          </View>}
          {busy && <View style={styles.progress}><ActivityIndicator color={blue} /><Text style={styles.progressText}>Gözləyin…</Text></View>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <View style={styles.divider} />
          <Text style={styles.footer}>© {new Date().getFullYear()}. İnnovasiya və Rəqəmsal İnkişaf Agentliyi</Text>
          {!!versionLabel && <Text style={styles.version}>Versiya {versionLabel}</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    {obscured && <View style={styles.privacy}><Image source={require('./assets/rih-login.png')} style={styles.logo} resizeMode="contain" /></View>}
  </SafeAreaView>;
  return <AuthContext.Provider value={{ session, authenticated: phase === 'home' && !!session, screen, getAccessToken, lock, logout }}>
    {children}
    {obscured && <View style={styles.privacy}><Image source={require('./assets/rih-login.png')} style={styles.logo} resizeMode="contain" /></View>}
  </AuthContext.Provider>;
}

function Action({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled}
    style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (disabled || pressed) && styles.dim]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
  </Pressable>;
}
function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}
export default function App({ children }: { children: ReactNode }) { return <SafeAreaProvider><AuthApp>{children}</AuthApp></SafeAreaProvider>; }

// Tbu.Web login palette: #eef3fb–#dce7f7 page, white card, #007bff Digital Login border.
const blue = '#007BFF';
const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#E5EDF9' },
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 32 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 32, paddingTop: 40, paddingBottom: 28, alignItems: 'center',
    shadowColor: '#152C52', shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  logo: { width: 120, height: 37, marginBottom: 20 },
  // Centered text is stretched to the card width: Android measures shrink-wrapped bold text
  // too narrow and clips the last word ("Yenidən xoş gördük" showed as "Yenidən xoş").
  system: { alignSelf: 'stretch', fontSize: 17, fontWeight: '600', lineHeight: 25, color: '#1E2A3A', textAlign: 'center', marginBottom: 6 },
  module: { alignSelf: 'stretch', fontSize: 13, letterSpacing: 1.1, textTransform: 'uppercase', color: '#8A97A8', textAlign: 'center' },
  divider: { alignSelf: 'stretch', height: 1, backgroundColor: '#E6EBF2', marginVertical: 24 },
  title: { alignSelf: 'stretch', fontSize: 20, fontWeight: '600', color: '#1E2A3A', lineHeight: 28, textAlign: 'center' },
  subtitle: { alignSelf: 'stretch', color: '#6B7A8C', fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  sso: { alignSelf: 'stretch', minHeight: 58, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 2, borderColor: blue, borderRadius: 10, backgroundColor: '#FFF' },
  ssoPressed: { borderColor: '#0069D9', backgroundColor: '#F5F9FF' }, ssoImage: { width: 182, height: 32 },
  hint: { alignSelf: 'stretch', fontSize: 13, lineHeight: 20, color: '#8A97A8', marginTop: 14, textAlign: 'center' },
  form: { alignSelf: 'stretch', marginTop: 20 },
  button: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: blue, marginTop: 12, padding: 12 },
  secondaryButton: { backgroundColor: '#FFF', borderWidth: 2, borderColor: blue },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '600', textAlign: 'center' }, secondaryText: { color: blue }, dim: { opacity: 0.5 },
  label: { color: '#374557', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  pin: { backgroundColor: '#F7F9FC', borderWidth: 1, borderColor: '#D5DEE9', borderRadius: 10, minHeight: 60,
    fontSize: 26, letterSpacing: 18, textAlign: 'center', paddingHorizontal: 20, color: '#1E2A3A', marginBottom: 16 },
  link: { color: '#4F6680', fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 18, paddingVertical: 6 },
  error: { alignSelf: 'stretch', color: '#A22F3D', backgroundColor: '#FFF0F1', padding: 14, borderRadius: 10, marginTop: 18, lineHeight: 21 },
  footer: { alignSelf: 'stretch', color: '#9AA6B5', fontSize: 12, textAlign: 'center' }, version: { alignSelf: 'stretch', color: '#B4BECA', fontSize: 11, textAlign: 'center', marginTop: 6 }, loader: { marginVertical: 24 },
  progress: { flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', marginTop: 20 }, progressText: { color: '#6B7A8C' },
  badge: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#EBF7F0', padding: 12, borderRadius: 10 },
  offlineBadge: { backgroundColor: '#FFF5DE' }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#19824E' },
  offlineDot: { backgroundColor: '#AC7817' }, badgeText: { color: '#314C42', fontSize: 13, fontWeight: '600' },
  details: { marginVertical: 12 }, detail: { borderBottomWidth: 1, borderBottomColor: '#EEF2F5', paddingVertical: 14, gap: 5 },
  detailLabel: { color: '#6D7E8A', fontSize: 12 }, detailValue: { color: '#1E2A3A', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  settlement: { gap: 3, marginTop: 5 },
  biometricNote: { color: blue, textAlign: 'center', fontSize: 13, marginBottom: 10 },
  privacy: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#E5EDF9', alignItems: 'center', justifyContent: 'center' },
});
