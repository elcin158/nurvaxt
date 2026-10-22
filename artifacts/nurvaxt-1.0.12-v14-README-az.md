# NurVaxt 1.0.12 — Play Store buraxılışı

22 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.12**;
`versionCode`: **14** — istifadəçinin göstərdiyi kod.

## Hazır fayllar

- **Play Console üçün:** `nurvaxt-1.0.12-v14.aab` — 59.25 MiB.
- **Yenilik mətni:** `google-play/release-notes-1.0.12-az.txt` — 197 simvol.
- **Birbaşa quraşdırma üçün:** `nurvaxt-1.0.12-release.apk` — 79.01 MiB; yoxlanmış AAB-dən çıxarılıb.
- **Paket hesabatları:** `nurvaxt-1.0.12-v14.validation.json`, `nurvaxt-1.0.12-release.json`.
- **Ümumi yoxlama hesabatı:** `../docs/releases/1.0.12/verification.json`.

Play Console-a AAB faylı və Azərbaycan dilində yenilik mətni əlavə edilir.
Bu tapşırıqda Console-a yükləmə və yayım edilməyib.

## Dəyişiklik

Əsas namaz kartındakı “Son 15 dəqiqə” və “Son 30 dəqiqə” yazıları çıxarılıb.
Saniyəlik geri sayım, vaxt zolağı və yaxınlaşan namazın rəng göstəricisi saxlanılır.
Əvvəlki yerli 1.0.11 paketindəki parlaq canlı bildiriş zolağı və oxunaqlılıq
düzəlişləri də daxildir. Paket cari iş qovluğundakı tətbiq dəyişikliklərini ehtiva edir.

## Yoxlamalar

TypeScript, ESLint, **166 JavaScript testi** (16 suite), imzalanmış release
yığılması və `lintVitalRelease` uğurla keçib. Mənbə/build/test fayllarının
250 SHA-256 dəyəri qeydə alınıb və yığmadan sonra uyğunluğu yoxlanıb.
Native modul mənbələri 1.0.11-dən dəyişməyib; native unit və instrumentation
testləri bu buraxılışda təkrar icra olunmayıb.

AAB üçün bundletool yoxlaması, əvvəlki buraxılışla imza açarının uyğunluğu,
versiya kodunun **14** olması, icazələr, offline verilənlər bazası və
48 ədəd 64 bit native kitabxananın 16 KB ELF düzləndirilməsi təsdiqlənib.
AAB-dən çıxarılan APK-nin imzası, 16 KB ZIP düzləndirilməsi, dörd bildiriş
səsi və bildiriş resursları da yoxlanıb.

Ayrıca **NurVaxt_Store / Android 15** emulyatorunda əvvəlki yerli
**1.0.11 / kod 14** üzərinə quraşdırma, bütün ayarların qorunması,
internetsiz açılış və canlı geri sayım bildirişi keçib. Bu, eyni kodlu iki
yerli paketin quraşdırma yoxlamasıdır; Play vasitəsilə yenilənmə sınanmayıb.
Quraşdırılmış bazanın 6 808 sətri, 61 272 vaxt dəyəri və 74 bölgəsi
mənbə bazası ilə tam uyğun gəlib. Namaza 10 dəqiqədən az qaldığı anda
əsas ekran və genişləndirilmiş bildiriş vizual yoxlanıb; əlavə “Son 15 dəqiqə”
yazısı göstərilmir. Fatal runtime xətası qeydə alınmayıb.

Fiziki cihazda və 16 KB səhifəli cihazda runtime yoxlaması aparılmayıb.

AAB SHA-256:
`404284640883bae94f1290f762d665616dfee9fc76064582c25cd1804e49a7e1`.

İmza sertifikatının SHA-256 izi:
`01e6e344bf078c3928dd2079192c6243636400a1916d494427eadc64e474e86e`.

## Təkrar yığma

```bash
npm run android:bundle -- --offline -PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

Mövcud `.signing/` açarı növbəti buraxılışlarda da saxlanılmalıdır.
AAB və yeni APK faylları git-də saxlanılmır.
