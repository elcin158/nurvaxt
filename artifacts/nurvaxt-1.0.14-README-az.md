# NurVaxt 1.0.14 — Play Store test versiyası

31 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.14**; `versionCode`: **17**.

## Hazır fayllar

- **Play Console üçün imzalı AAB:** `nurvaxt-1.0.14-v17.aab`.
- **Birbaşa sınaq üçün imzalı APK:** `nurvaxt-1.0.14-v17-release.apk`; həmin AAB-dən yaradılıb.
- **Release name:** `1.0.14 (17)`.
- **Azərbaycan dilində yenilik mətni:** `google-play/release-notes-1.0.14-az.txt`.
- **Ümumi yoxlama hesabatı:** `../docs/releases/1.0.14/verification.json`.

AAB-ni Play Console-dakı mövcud test buraxılışına əlavə edin. Bu işdə Play Console-a
yükləmə və yayım edilməyib.

## Eyni yenilik mətni

Tətbiqdə və Play Store üçün eyni üç dəyişiklik göstərilir:

- Vahid yeniləmə paneli.
- “Sonra”dan sonra qalan “Yenilə” nişanı.
- Ayarlarda yeniliklər tarixçəsi və vacib yeniliklərin bir dəfə təqdim edilməsi.

Əsas mənbə `src/features/app-updates/releases.ts` faylıdır. Play Store mətni həmin
başlıq və təsvirlərdən avtomatik yaradılır; **287 simvoldur**. Paketdə bütün mətnlərin
olması, AAB və APK-nin JavaScript məzmununun eyniliyi də yoxlanıb.

```bash
npm run release:notes
npm run release:notes:check
```

Release yığılmasından əvvəl versiya, kod, mətnlərin eyniliyi və 500 simvol həddi
avtomatik yoxlanır. Gələcək buraxılışlarda mətni əsas mənbədə dəyişib yenidən yaradın.

## Daxil olan davranış

- Yeniləmə təklifi, yüklənmə və “Yenidən başlat” vahid paneldədir.
- “Sonra” eyni versiyanın avtomatik təklifini 24 saat gizlədir; nişan isə qalır.
- Bağlanmış panel yüklənmə hadisələrinə görə təkrar açılmır. Nişan və Ayarlar onu yenidən açır.
- Hazır yeniləmə yalnız istifadəçi “Yenidən başlat” seçəndə quraşdırılır.
- Mövcud istifadəçi 1.0.14-ə keçəndə yeniliklər bir dəfə təqdim edilir. Təmiz quraşdırmada
  onboarding-dən sonra əlavə yenilik paneli açılmır.
- Mətni tətbiqdə olmayan gələcək versiya üçün Play Store-dakı detallara keçid verilir.

## Yoxlamalar

- İmzalı release yığılması və `lintVitalRelease` uğurludur.
- TypeScript və **18 test dəstində 190 JavaScript testi** keçib.
- **24 native unit test** bu yığılmada icra edilib və keçib.
- ESLint xətası yoxdur; əvvəlki video skriptində istifadə olunmayan `mix` xəbərdarlığı qalır.
- AAB bundletool ilə yoxlanıb; AAB/APK mövcud release açarı və əvvəlki buraxılışla uyğun imzalanıb.
- Dörd arxitektura, 16 KB düzləndirilməsi, offline baza, dörd xatırlatma səsi və bildiriş
  resursları yoxlanıb. Cihaz filtrləri kod 16 ilə eynidir.
- Yığılma müddətində 234 mənbə faylının dəyişmədiyi təsdiqlənib.

Bu paket cihazda və Google Play üzərindən quraşdırılaraq yoxlanmayıb. Cihaz kataloqu
və real Play yeniləmə axını test kanalına yükləndikdən sonra yoxlanmalıdır.

## Təkrar yığma

```bash
NODE_ENV=production npm run android:bundle -- --offline :nurvaxt-alarm:testReleaseUnitTest
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

Mövcud `.signing/` açarını saxlayın. APK və AAB git-də saxlanılmır; checksum və imza
məlumatları `nurvaxt-1.0.14-v17.validation.json`, `nurvaxt-1.0.14-v17-release.json`
və ümumi yoxlama hesabatındadır.
