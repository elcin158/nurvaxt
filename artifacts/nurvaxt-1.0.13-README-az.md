# NurVaxt 1.0.13 — Play Store test versiyası

22 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.13**; `versionCode`: **16**.

## Hazır fayllar

- **Play Console üçün AAB:** `nurvaxt-1.0.13-v16.aab` — 72.68 MiB.
- **Release name:** `1.0.13 (16)`.
- **Yenilik mətni:** `google-play/release-notes-1.0.13-az.txt`.
- **Birbaşa quraşdırma üçün APK:** `nurvaxt-1.0.13-v16-release.apk` — 101.36 MiB; həmin AAB-dən çıxarılıb.
- **Ümumi yoxlama hesabatı:** `../docs/releases/1.0.13/verification.json`.

AAB-ni mövcud Play Console test buraxılışına əlavə edin. Bu tapşırıqda Play Console-a yükləmə və yayım edilməyib.

## Dəyişiklik

Canlı bildirişdə vaxt zolağının və cari mövqe göstəricisinin xarici kölgəsi silinib.
Parlaq zolaq, namaza qalan vaxt və qırmızı kərahət intervalları saxlanılır.
Cari iş qovluğundakı bildiriş düzəlişi bu paketə daxildir.

## Yoxlamalar

- Release yığılması və `lintVitalRelease` keçib.
- TypeScript, 16 test dəstində 166 JavaScript testi və ESLint keçib.
- ESLint üçün Node alətlərində `Buffer` və CommonJS-də `__dirname` tanıdılıb;
  video render skriptində istifadə olunmayan `mix` üçün bir xəbərdarlıq qalır.
- 24 native unit testin uğurlu nəticəsi Gradle tərəfindən keşdən qəbul edilib; bu dəfə yenidən icra edilməyib.
- bundletool validasiyası, AAB/APK imzaları və əvvəlki release açarı ilə uyğunluq keçib.
- Dörd arxitektura saxlanılıb: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`; hər biri üçün 24 native kitabxana var.
- 64 bit native kitabxanaların ELF düzləndirilməsi və AAB/APK üçün 16 KB düzləndirməsi keçib.
- Offline baza mənbə ilə bayt səviyyəsində uyğundur; dörd xatırlatma səsi və paketdəki bildiriş resursları yoxlanıb.
- Kod 15 ilə cihaz filtrləri, Android SDK tələbləri, icazələr və native kitabxana əhatəsi uyğundur.
- Yığma zamanı 213 mənbə faylının dəyişmədiyi yoxlanıb.

Bu buraxılış cihazda və Play Store üzərindən quraşdırılaraq yoxlanmayıb.
Cihaz kataloquna uyğunluq yalnız yeni AAB Play Console-a yükləndikdən sonra təsdiqlənə bilər.

AAB SHA-256: `58838adaa77a1dc84b6252a072f485e40bcdbe3f40dafa06d20f5d7f175f3cad`.

APK SHA-256: `ea3d1e5629f6a5aff9300351ec8830c4788610d33c7e482faedf55fa37c33e4f`.

## Təkrar yığma

```bash
NODE_ENV=production npm run android:bundle -- --offline
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

Mövcud `.signing/` açarını saxlayın. AAB və APK faylları git-də saxlanılmır.
