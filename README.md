# EVTAS Mobile

Planşet üçün ayrıca React Native + Expo + TypeScript layihəsi. Backend:
`rihis-back/Tbu.Mobile.Api`. İlk mərhələ Digital Login, 4 rəqəmli PIN, biometrik
açılış, sessiyanın yadda saxlanması və çıxışdan ibarətdir.

## Mühitin qurulması (sıfırdan)

Versiyalar Expo SDK 57 + React Native 0.86 tələblərinə görə seçilib.

| Proqram | Versiya | Linux (Ubuntu) | Windows |
| --- | --- | --- | --- |
| Git | son | `sudo apt install git` | [git-scm.com](https://git-scm.com) |
| Node.js | **24 LTS** (`.nvmrc`) | [nvm](https://github.com/nvm-sh/nvm): `nvm install` | [nodejs.org](https://nodejs.org) → 24 LTS (.msi) |
| JDK | **17** | `sudo apt install openjdk-17-jdk` | [Microsoft OpenJDK 17](https://learn.microsoft.com/java/openjdk/download) |
| Android Studio | son stabil | [developer.android.com/studio](https://developer.android.com/studio) → `bin/studio.sh` | eyni ünvan (.exe) |
| Android SDK Platform | **Android 16 (API 36)** | Android Studio → SDK Manager | eyni |
| VS Code (istəyə bağlı) | son | `sudo snap install code --classic` | [code.visualstudio.com](https://code.visualstudio.com) |

JDK 17 qəsdən saxlanılır: React Native JDK 17 tövsiyə edir, daha yeni JDK-larla Gradle build problemləri ola bilər.
Expo SDK 57 `compileSdk`/`targetSdk` 36 istifadə edir.

Android Studio ilk açılışda **Standard** quraşdırma seçilir. Sonra **More Actions → SDK Manager**:

- **SDK Platforms:** Android 16 (API 36)
- **SDK Tools:** Android SDK Build-Tools, Android SDK Platform-Tools, Android Emulator,
  Android SDK Command-line Tools

### Mühit dəyişənləri

Linux (`~/.bashrc`, sonra `source ~/.bashrc`):

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

Windows (Start → "Edit the system environment variables" → Environment Variables):

- `JAVA_HOME` = JDK 17 qovluğu (məs. `C:\Program Files\Microsoft\jdk-17...`)
- `ANDROID_HOME` = `C:\Users\<istifadəçi>\AppData\Local\Android\Sdk`
- `Path`-ə: `%ANDROID_HOME%\platform-tools` və `%ANDROID_HOME%\emulator`

### Yoxlama

Yeni terminalda:

```bash
git --version
node -v        # v24.x
java -version  # 17.x
adb --version
```

### Cihaz

- **Real planşet:** Settings → About → Build number-a 7 dəfə toxunun → Developer options →
  **USB debugging** aktiv edin, USB ilə qoşun.
- **Emulator:** Android Studio → Device Manager → Create Device (Tablet) → işə salın.

`adb devices` cihazı göstərməlidir.

## Mühitlər

API ünvanı `env/<mühit>.env` faylından götürülür. npm skriptləri `scripts/with-env.mjs` vasitəsilə
lazımi faylı oxuyub Expo-nu həmin dəyərlərlə işə salır.

| Mühit | Fayl | API | Kim üçün |
| --- | --- | --- | --- |
| local | `env/local.env` | `http://etrrihmobilelocal.idda.az:5248` | Developer-in öz kompüterindəki API (emulator) |
| dev | `env/dev.env` | `https://etrrihmobiledev.idda.az` | DNS üzərindən |
| stage | `env/stage.env` | _təyin ediləcək_ | DNS üzərindən |
| production | `env/production.env` | _təyin ediləcək_ | DNS üzərindən |

| Əmr | Nə edir |
| --- | --- |
| `npm run android` | debug build, **local** |
| `npm run android:dev` / `:stage` / `:prod` | debug build, seçilən server |
| `npm run release:dev` / `:stage` / `:prod` | release build (cihaza quraşdırılır, Metro tələb etmir) |
| `npm start` / `start:dev` / `start:stage` / `start:prod` | quraşdırılmış debug build üçün yalnız Metro |

`http://` yalnız debug build-də qəbul edilir; release build HTTPS tələb edir. Metro keşi mühitə görə
ayrılır (`metro.config.js`), ona görə mühit dəyişəndə keşi təmizləmək lazım deyil.
Fayllarda sirr saxlanmır, yalnız ünvanlar var.

## İşə salmaq

```bash
npm ci
npm run android             # ilk dəfə: native build + cihaza quraşdırma
npm start                   # sonrakı dəfələr: yalnız Metro
```

USB ilə qoşulmuş cihaz Metro-ya qoşulmursa: `adb reverse tcp:8081 tcp:8081`.
Scheme və ya native modul dəyişəndə yenidən `npm run android`.

### Lokal API-yə emulatordan qoşulma

Emulator kompüterin `hosts` faylını oxumur və onun içində `127.0.0.1` emulatorun özüdür. Ona görə
`etrrihmobilelocal.idda.az` emulatorun öz `/system/etc/hosts` faylında kompüterə (`10.0.2.2`) yönləndirilir.
Bunun üçün `google_apis` image-li emulator lazımdır (Play Store image root vermir).

```bash
# 1. Emulatoru yazıla bilən sistemlə açın (hər dəfə bu flag ilə)
emulator -list-avds
emulator -avd <AVD adı> -writable-system

# 2. Domeni 10.0.2.2-yə yönləndirin (ilk dəfə emulatoru avtomatik yenidən başladır)
npm run emulator:hosts

# 3. API (rihis-back): dotnet run --project Tbu.Mobile.Api  → http://etrrihmobilelocal.idda.az:5248
npm run android             # local mühit
```

Emulator `-writable-system` olmadan açılsa və ya wipe/cold boot edilsə, qeyd görünməyə bilər; onda
`npm run emulator:hosts` təkrarlanır. Kompüterdə brauzerdən yoxlamaq üçün kompüterin `hosts` faylına
`127.0.0.1 etrrihmobilelocal.idda.az` əlavə edin (Linux: `/etc/hosts`,
Windows: `C:\Windows\System32\drivers\etc\hosts`).

### Real planşet

Real cihazın `hosts` faylı dəyişdirilmir, ona görə lokal domen planşetdə açılmır. Lokal API üçün USB rejimi
istifadə olunur: tətbiq `http://localhost:5248`-ə müraciət edir, `adb reverse` isə bu portu kompüterin API-sinə
ötürür (Metro `8081` də daxil olmaqla). Planşet USB və ya Wireless debugging ilə adb-yə qoşulu olmalıdır.

```bash
adb devices                 # yalnız planşet görünsün (emulatoru bağlayın)
npm run android:usb         # ilk dəfə: build + quraşdırma
npm run start:usb           # sonrakı dəfələr
```

Kabel yenidən qoşulanda `npm run start:usb` təkrar işlədilir. Dev, stage və production serverləri planşetdə
DNS üzərindən işləyir: `npm run android:dev` (debug) və ya `npm run release:dev`.

**Expo Go bu layihədə işləmir** (OAuth redirect `evtas://` və biometrik saxlama development build tələb edir).
`npm run ios` iOS development build yaradır; bunun üçün macOS və Xcode lazımdır.

Qeydlər:

- Windows-da layihəni qısa yola qoyun (məs. `C:\dev\tbu-mobile`); uzun yollarda Gradle xəta verir.
- Android Studio, SDK və emulator ~15–20 GB yer tutur; ən azı 16 GB RAM tövsiyə olunur.

Digital Login-də `evtas://auth/callback` dəqiq qeydiyyata alınmalıdır. Mobil konfiqurasiyada
`scheme: "evtas"`, API-də `AuthenticationParams:RedirectUrl: "evtas://auth/callback"` istifadə edilir.
Client secret, JWT imzalama açarı və verilənlər bazası bağlantıları mobil `env/*.env` fayllarına daxil edilmir.

## Davranış

- İlk giriş internetlə Digital Login-də edilir. PKCE verifier cihazda yaradılır və API-yə
  ötürülür; callback-in tam ünvanı, state-i və birdəfəlik kodu yoxlanılır.
- Girişdən sonra istifadəçi 4 rəqəmli PIN yaradır və təkrar daxil edir.
- API ilkin olaraq girişi 24 saat yadda saxlayır. `MobileSession:RememberDays` ilə 1–30 gün
  seçilir; mobil tətbiq serverin qaytardığı sabit son tarixi tətbiq edir.
- Tətbiq arxa plana keçəndə kilidlənir. Yenidən açılışda PIN və ya aktiv edilmiş biometrika lazımdır.
- Biometrika mövcud olan cihazlarda profil ekranından aktiv edilir. Biometrik açar OS-in
  autentifikasiya tələb edən Keychain/Keystore yaddaşında saxlanılır. Sensor/enrollment dəyişərsə PIN işləyə bilər.
- PIN təsadüfi vault açarını PBKDF2-SHA256 (210 000 iterasiya), salt və cihaz sirri ilə qoruyur.
  Android/iOS-da hesablama native worker-də aparılır; əvvəl saxlanmış PIN-lər dəyişmədən işləyir.
  Sessiya AES-256-GCM ilə şifrələnib tətbiqin lokal faylında saxlanır. Xam PIN saxlanmır.
- Ardıcıl 5 səhv PIN cəhdi lokal auth məlumatlarını silir; Digital Login yenidən tələb olunur.
  PIN unudulduqda da yenidən Digital Login istifadə edilir.
- Bağlantı varsa açılışda refresh edilir (maksimum 3 saniyə gözləmə). Şəbəkə/API müvəqqəti əlçatmazdırsa sessiyanın son
  tarixinədək lokal açılışa icazə verilir. API-dən 401/403 alınarsa lokal giriş ləğv edilir.
- Son tarix açıq ekranda da yoxlanılır. Cihaz saatının geriyə dəyişməsi üçün müdafiə var;
  tam offline cihazda uzaqdan ləğvin və etibarlı vaxtın sərhədləri nəzərə alınmalıdır.
- Offline çıxış lokal auth-u silir. Serverə sorğu çatmayıbsa server sessiyası son tarixinədək
  mövcud qala bilər. Sonrakı təsərrüfat məlumatlarının saxlanması auth-dan ayrı qurulmalıdır.

## Yoxlama

```bash
npm run test:auth
npm run lint
npm run typecheck
npx expo export --platform android --platform ios --max-workers 1
```

Auth testləri əvvəl saxlanmış PIN-lərin native hesablama ilə uyğunluğunu, səhv cəhd limitini,
sessiya müddətini və şəbəkə timeout-larını yoxlayır. Host testlərində native PBKDF2 üçün Node
kripto mühərriki istifadə olunur. TypeScript və Metro/Hermes bundle yoxlamaları native APK/IPA
build-i, canlı Digital Login və real sensor yoxlamasını əvəz etmir.
Tətbiqdə təsərrüfat ekranları/sinxronizasiya hələ yoxdur.

`app.json` daxilindəki `az.rihis.evtas.mobile` ilkin package/bundle identifikatorudur;
yayım üçün təşkilatın təsdiqlədiyi identifikator və imzalama konfiqurasiyası verilməlidir.

## Asılılıq qeydləri

Quraşdırılan Expo SDK 57 alətlərinin tranzitiv `braces`, `node-forge` və `uuid`
asılılıqları üçün npm audit xəbərdarlıqları var. `braces` və `node-forge` üçün
yoxlama zamanı uyğun düzəliş versiyası göstərilmirdi. Bunlar auth kodunda istifadə
olunan kriptoqrafiya kitabxanaları deyil; sessiya şifrələməsi `@noble` ilə edilir.
Expo-nu köhnə major versiyaya endirən avtomatik `audit fix --force` tətbiq edilməyib.
Native yayım hazırlanarkən SDK/alət yeniləmələri ayrıca nəzərdən keçirilməlidir.
