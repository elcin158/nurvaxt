# NurVaxt 1.0.8 — Play Store test buraxılışı

19 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.8**; `versionCode`: **10**.

## Fayllar

- **Play Console üçün AAB:** `nurvaxt-1.0.8-v10.aab` (73.38 MiB).
- **Yenilik mətni:** `google-play/release-notes-1.0.8-az.txt`.
- **Yerli sınaq üçün APK:** `nurvaxt-1.0.8-release.apk`; yoxlanmış AAB-dən çıxarılıb.
- **Paket yoxlamaları:** `nurvaxt-1.0.8-v10.validation.json`.
- **Sınaq nəticələri:** `../docs/releases/1.0.8/verification.json`.

Paket istifadəçinin mövcud Play test kanalına əl ilə yükləməsi üçün hazırlanıb.
Bu tapşırıqda Play Console-a yükləmə və yayım edilməyib.

## Dəyişikliklər

- Geri sayım bildirişinin yığcam və geniş görünüşlərinə taymer nişanı əlavə edilib.
- Boş mərhələ yazısı gizlədilir; adi namaz geri sayımında təkrarlanan mətn azaldılıb.
- Başlanğıc bildirişinin başlığı NurVaxt olaraq yenilənib.
- Taymer nişanının açıq/tünd mövzu və son 15/30 dəqiqə rəngləri uyğunlaşdırılıb.

## Yoxlamalar

TypeScript, ESLint, 175 Jest testi, 15 native unit testi, release yığılması və
`lintVitalRelease` uğurla keçib. Bundletool yoxlaması, AAB imzası, əvvəlki yerli
release açarı ilə uyğunluq, paket versiyası, icazələr, offline verilənlər bazası və
48 ədəd 64 bit native kitabxananın 16 KB ELF düzləndirilməsi yoxlanıb.

AAB-dən alınan APK-nin imzası, 16 KB ZIP düzləndirilməsi və yeni taymer nişanı daxil
olmaqla paketlənmiş bildiriş resursları da yoxlanıb. Bu buraxılış üçün cihazda icra
və Play vasitəsilə yenilənmə sınağı aparılmayıb.

AAB SHA-256:
`e05c102c50a2418ecdd908a64cc71edd832e2b3bf81d0ee3750a53d0c0c7af9e`.

İmza sertifikatının SHA-256 izi:
`01e6e344bf078c3928dd2079192c6243636400a1916d494427eadc64e474e86e`.

## Təkrar yığma

```bash
npm run android:bundle
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

AAB və APK faylları git-də saxlanılmır. Mövcud `.signing/` release açarı qorunmalıdır.
