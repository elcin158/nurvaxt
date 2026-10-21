# NurVaxt 1.0.10 — Play Store test buraxılışı

21 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.10**; `versionCode`: **13**.

## Hazır fayllar

- **Play Console üçün:** `nurvaxt-1.0.10-v13.aab` — 72.68 MiB.
- **Yenilik mətni:** `google-play/release-notes-1.0.10-az.txt` — 343 simvol.
- **Birbaşa quraşdırma üçün:** `nurvaxt-1.0.10-release.apk` — 101.36 MiB; yoxlanmış AAB-dən çıxarılıb.
- **Paket yoxlamaları:** `nurvaxt-1.0.10-v13.validation.json`, `nurvaxt-1.0.10-release.json`.
- **Ümumi hesabat:** `../docs/releases/1.0.10/verification.json`.

Mövcud Play test kanalına AAB faylı və yenilik mətni əlavə edilə bilər.
Play Console-a yükləmə və yayım edilməyib. Versiya kodu yerli son buraxılışın
12 kodundan 13-ə artırılıb; Console-dakı istifadə olunmuş kodlar ayrıca oxunmayıb.

## Dəyişikliklər

- Kərahət vaxtları aktiv olduqda əsas ekranın yerləşməsi və sürüşdürülməsi yenilənib.
- Geri sayım kartından təkrarlanan izahlar çıxarılıb.
- Kompakt bildirişdə kərahət ayrıca sətir əvəzinə vaxt zolağında göstərilir.
- Geniş bildirişdə kərahətə qalan dəqiqələr ayrıca yenilənir; göstərilən saat başlanma və ya bitmə mərhələsinə uyğundur.
- Bildirişin vaxt zolağında cari mövqeyi sadə dairəvi nöqtə göstərir.

Paket cari iş qovluğundakı commit edilməmiş tətbiq dəyişikliklərini ehtiva edir.
Mənbə commit-i və tətbiq/build fayllarının SHA-256 dəyərləri yoxlama qovluğunda qeyd edilib.

## Yoxlamalar

TypeScript, ESLint, **166 JavaScript testi** (16 suite), **24 native unit testi**
(5 suite), release yığılması və `lintVitalRelease` uğurla keçib.

AAB üçün bundletool yoxlaması, əvvəlki buraxılışla imza açarının uyğunluğu,
paket versiyası, icazələr, offline verilənlər bazası və 48 ədəd 64 bit native
kitabxananın 16 KB ELF düzləndirilməsi təsdiqlənib. AAB-dən çıxarılmış APK-nin
imzası, 16 KB ZIP düzləndirilməsi, dörd bildiriş səsi və bildiriş resursları da yoxlanıb.

**NurVaxt_Store / Android 15** emulyatorunda 1.0.9 / kod 12-dən yenilənmə,
bütün saxlanmış ayarların qorunması, internetsiz açılış, əsas ekran və real geri sayım
bildirişi yoxlanıb. Quraşdırılmış bazadakı **6 808 sətir / 61 272 vaxt dəyəri / 74 bölgə**
mənbə bazası ilə tam uyğun gəlib. Əsas ekran və bildiriş şəkilləri vizual yoxlanıb.
Saniyəlik geri sayım UIAutomator-un boş vəziyyətə keçməsinə mane olduğu üçün əsas
ekranın avtomatik mətn yoxlaması tamamlanmayıb; saxlanmış şəkil yoxlanıb.

Bu paket fiziki cihazda, 16 KB səhifəli cihazda və Play vasitəsilə
quraşdırma/yenilənmə axınında sınanmayıb.

AAB SHA-256:
`159809be5f20da518eb84cb2ebbeb198ee9e9331764d415990be224204ac6e34`.

İmza sertifikatının SHA-256 izi:
`01e6e344bf078c3928dd2079192c6243636400a1916d494427eadc64e474e86e`.

## Təkrar yığma

```bash
npm run android:bundle
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

AAB və APK git-də saxlanılmır. Mövcud `.signing/` açarı növbəti buraxılışlarda da istifadə edilməlidir.
