# NurVaxt 1.0.9 — Play Store test buraxılışı

20 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.9**; `versionCode`: **12**.

## Fayllar

- **Play Console üçün AAB:** `nurvaxt-1.0.9-v12.aab` (72.68 MiB).
- **Yenilik mətni:** `google-play/release-notes-1.0.9-az.txt` (404 simvol).
- **Yerli sınaq üçün APK:** `nurvaxt-1.0.9-release.apk` (101.36 MiB); yoxlanmış AAB-dən çıxarılıb.
- **AAB yoxlamaları:** `nurvaxt-1.0.9-v12.validation.json`.
- **APK yoxlamaları:** `nurvaxt-1.0.9-release.json`.
- **Sınaq nəticələri:** `../docs/releases/1.0.9/verification.json`.

Paket mövcud Play test kanalına əl ilə yüklənmək üçün hazırdır.
Play Console-a yükləmə və yayım edilməyib.

`versionCode` 11 Play Console-da artıq istifadə olunduğu üçün paket 12 kodu ilə yenidən yığılıb.
Play Console-a `nurvaxt-1.0.9-v12.aab` yüklənməlidir.

## Dəyişikliklər

- Namaz vaxtları siyahısı genişləndirildi, adlar böyüdüldü və sətir ayırıcıları aydınlaşdırıldı.
- Geri sayım kartında təkrarlanan yazılar azaldıldı.
- Bildirişdə namaz və kərahət saatları, saniyəlik geri sayım və vaxtın gedişini göstərən xətt yeniləndi.
- Namaz xatırlatmaları və geri sayım status sətrində vahid nişan altında birləşdirildi.
- Artıq lazım olmayan ayrıca canlı bildiriş ayarları ekranı çıxarıldı.

Paket iş qovluğundakı cari dəyişiklikləri də ehtiva edir; mənbə commit-i və bu fakt yoxlama hesabatında qeyd edilib.

## Yoxlamalar

TypeScript, ESLint, 166 Jest testi (16 suite), 23 native unit testi (5 suite),
release yığılması və `lintVitalRelease` uğurla keçib.
12 kodlu paket üçün TypeScript, konfiqurasiya lint-i və paket yoxlamaları təkrarlanıb;
yalnız versiya kodu dəyişdiyi üçün 166 JavaScript testinin əvvəlki nəticəsi saxlanılıb.
Native unit test nəticələri Gradle-in dəyişməyən girişlər üçün keşindən götürülüb.
Bundletool AAB yoxlaması, imza, 1.0.8 buraxılışı ilə açar uyğunluğu, paket versiyası,
icazələr, offline verilənlər bazası və 48 ədəd 64 bit native kitabxananın 16 KB ELF
düzləndirilməsi təsdiqlənib.

AAB-dən alınan APK-nin imzası, 16 KB ZIP düzləndirilməsi, dörd bildiriş səsi,
verilənlər bazası və yeni kompakt/geniş bildiriş resursları da yoxlanıb.
Resurs yoxlama skripti yeni tərəqqi xətti və iki geri sayım üçün yenilənib.
Bu konkret buraxılış üçün cihazda icra, 16 KB səhifəli cihaz və Play vasitəsilə
quraşdırma/yenilənmə sınağı aparılmayıb.

AAB SHA-256:
`db4a44f3332f064563b6998f852853b64d3b1b166e62610b16380dddaf06d0f8`.

İmza sertifikatının SHA-256 izi:
`01e6e344bf078c3928dd2079192c6243636400a1916d494427eadc64e474e86e`.

## Təkrar yığma

```bash
npm run android:bundle
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

AAB və APK faylları git-də saxlanılmır. Mövcud `.signing/` release açarı qorunmalıdır.
