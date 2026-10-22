# NurVaxt 1.0.12 — kod 15, cihaz uyğunluğu düzəlişi

22 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.12**; `versionCode`: **15**.

## Play Console üçün

- **AAB:** `nurvaxt-1.0.12-v15.aab` — 72.68 MiB.
- **Release name:** `1.0.12 (15)`.
- **Yenilik mətni:** `google-play/release-notes-1.0.12-az.txt`.
- **Birbaşa quraşdırma üçün APK:** `nurvaxt-1.0.12-v15-release.apk` — 101.36 MiB; bu AAB-dən çıxarılıb.
- **Ümumi yoxlama hesabatı:** `../docs/releases/1.0.12/v15/verification.json`.

Buraxılışdakı əvvəlki kod 14 AAB-sini bu kod 15 faylı ilə əvəz edin.
Kod 14 Console-a yükləndiyinə görə yeni fayl üçün kod 15 seçilib;
[Google Play istifadə olunmuş versiya kodunun təkrar yüklənməsini qəbul etmir](https://developer.android.com/studio/publish/versioning).
Bu tapşırıqda Play Console-a yükləmə və yayım edilməyib.

## Düzəliş

Kod 14 paketində çatışmayan 32 bit `x86` dəstəyi bərpa edilib.
AAB dörd arxitekturanı ehtiva edir: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
Hər biri üçün 24 native kitabxana yoxlanıb. AAB və APK yoxlayıcıları bundan sonra
arxitekturalardan biri çatışmayan paketi qəbul etmir. README-dəki yığma əmrləri
standart dörd arxitekturadan istifadə edir.

1.0.10 / kod 13 ilə müqayisədə arxitekturalar, hər arxitekturanın kitabxana adları,
minimum/target Android tələbləri, cihaz filtrləri, tələb olunan kitabxanalar,
icazələr və imza sertifikatı eynidir. Müqayisə
`../docs/releases/1.0.12/v15/compatibility-vs-v13.json` daxilindədir.
Console-da xəbərdarlığın aradan qalxması yeni AAB yükləndikdən sonra təsdiqlənməlidir.

## Yoxlamalar

Release yığılması, `lintVitalRelease`, TypeScript, ESLint, Python yoxlayıcılarının
sintaksisi, bundletool, AAB/APK imzaları və 16 KB ELF/ZIP düzləndirilməsi keçib.
Offline baza, dörd bildiriş səsi və bildiriş resursları yoxlanıb.

Ayrıca NurVaxt_Store / Android 15 emulyatorunda kod 14-dən 15-ə yenilənmə,
bütün ayarların qorunması, internetsiz açılış və canlı bildiriş keçib.
Bazada 6 808 sətir, 61 272 vaxt dəyəri və 74 bölgə mənbə ilə uyğun gəlib.
Əsas ekran və genişləndirilmiş bildiriş vizual yoxlanıb; fatal xəta qeydə alınmayıb.

JavaScript bundle və baza kod 14 paketindəki ilə bayt səviyyəsində eynidir.
166 JavaScript testinin əvvəlki nəticələri `../docs/releases/1.0.12/jest.json`
faylındadır; bu yığmada JavaScript/native unit testləri təkrar icra olunmayıb.
32 bit x86 cihazında, fiziki cihazda və 16 KB səhifəli cihazda runtime yoxlaması aparılmayıb.

AAB SHA-256: `852b460862feccccff5030d742915a304aa67968f32dc03fb7bd1c5c30970aa3`.

## Təkrar yığma

```bash
npm run android:bundle -- --offline
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

Mövcud `.signing/` açarını saxlayın. AAB və APK faylları git-də saxlanılmır.
Əvvəlki kod 14 təhvil sənədi `nurvaxt-1.0.12-v14-README-az.md` faylındadır.
