# NurVaxt 1.0.15 — Play Store test versiyası

2 noyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.15**; `versionCode`: **19**.

Play Console-un mövcud test kanalına yüklənəcək fayl:
**`nurvaxt-1.0.15-v19.aab`**. Buraxılış adı: **`1.0.15 (19)`**.

## Yeniliklər

- “Yeniliklər” bölməsində yalnız quraşdırılmış versiyanın dəyişiklikləri göstərilir.
- Ayarlardakı izah cari versiyaya uyğunlaşdırılıb.
- Android-də iPhone-a aid vibrasiya qeydi çıxarılıb.

Play Store üçün Azərbaycan dilində yenilik mətni:
`google-play/release-notes-1.0.15-az.txt`. Tətbiqdəki mətnlə eynidir və 193 simvoldur.

## Yoxlama faylları

- AAB imzası, SHA-256 və paket yoxlaması: `nurvaxt-1.0.15-v19.validation.json`.
- Ümumi yoxlama hesabatı: `../docs/releases/1.0.15/verification.json`.
- Yığılma, TypeScript, ESLint və test nəticələri: `../docs/releases/1.0.15/`.

İmzalı AAB və Android release yoxlamaları uğurludur. **196 JavaScript testi** və
**24 native test** keçib; TypeScript və ESLint xətası yoxdur. Əvvəlki video skriptində
istifadə olunmayan `mix` dəyişəninə aid bir ESLint xəbərdarlığı qalır.

İmza əvvəlki buraxılışın açarı ilə uyğundur. Dörd arxitektura, 16 KB düzləndirilməsi,
paketdəki baza və dörd xatırlatma səsi yoxlanıb. Cihaz filtrləri kod 18 ilə eynidir.
Yenilik mətninin AAB-də olduğu və yığılma ərzində mənbə fayllarının dəyişmədiyi təsdiqlənib.

Bu buraxılış üçün APK yaradılmır. Play Console-a yükləmə və yayım edilməyib;
Google Play üzərindən quraşdırma və yeniləmə testləri test kanalında aparılmalıdır.

## Təkrar yığma

```bash
npm run release:notes:check
NODE_ENV=production npm run android:bundle -- :nurvaxt-alarm:testReleaseUnitTest
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

Mövcud `.signing/` açarı saxlanmalıdır. Növbəti Play buraxılışında `versionCode`
artırılmalıdır. AAB git-də saxlanılmır; yoxlama hesabatındakı SHA-256 ilə tanınır.
Tam release yığılmasının yaddaş həddinə çatmaması üçün Gradle heap limiti 4 GB,
Metaspace limiti isə 1,5 GB təyin edilib.
