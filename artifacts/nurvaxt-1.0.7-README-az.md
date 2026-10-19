# NurVaxt 1.0.7 — Play Store buraxılışı

19 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.7**; `versionCode`: **9**.

## Yüklənəcək fayllar

- **Play Console → yeni buraxılış → App bundles:** `nurvaxt-1.0.7-v9.aab` (73.39 MiB).
- **Release notes:** `google-play/release-notes-1.0.7-az.txt` faylındakı `<az-AZ>` bloku.
- **Yerli sınaq üçün APK:** `nurvaxt-1.0.7-release.apk`; yoxlanmış AAB-dən bundletool ilə çıxarılıb.
- **Texniki yoxlama:** `nurvaxt-1.0.7-v9.validation.json`.
- **Sınaq nəticələri:** `../docs/releases/1.0.7/verification.json`.

## Daxil olan dəyişikliklər

- Google Play vasitəsilə tətbiqdaxili yeniləmə və Ayarlarda əl ilə yoxlama.
- Şəhər seçiminin və təkrar toxunuşların idarə edilməsində düzəlişlər.
- Namaz xatırlatmalarının oxunaqlı mətni və qruplaşdırılması.
- Aktiv geri sayım bildirişi silindikdən sonra səssiz bərpa.
- Kərahət müddətləri, ayrıca kərahət xatırlatmaları və gündəlik ekranın təkmilləşdirilməsi.

## Paket yoxlamaları

Bundletool 1.18.1 yoxlaması, JAR imzası və əvvəlki yerli release açarı ilə uyğunluq təsdiqlənib.
Target SDK 36, minimum SDK 24; `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` daxildir.
Paket `debuggable=false` olaraq yığılıb. Daxili JavaScript və offline verilənlər bazası yoxlanıb.
Bundle 16 KB ZIP düzləndirilməsi tələb edir; 48 ədəd 64 bit kitabxananın ELF LOAD
seqmentləri yoxlanıb. AAB-dən alınan APK `zipalign -c -P 16 4` yoxlamasından keçib.
16 KB cihazda icra sınağı aparılmayıb.

TypeScript, ESLint, 175 Jest testi, 15 native unit testi və `lintVitalRelease` uğurla keçib.
Bu buraxılış üçün Google Play-in real yeniləmə/yükləmə axını Play test kanalında ayrıca
sınanmalıdır; yerli APK həmin axını təsdiqləmir.

İmza sertifikatının SHA-256 izi:
`01e6e344bf078c3928dd2079192c6243636400a1916d494427eadc64e474e86e`.

AAB SHA-256:
`001421376b8e78899876748f9204b5176ef31f9a4c1479448efaa3da1cef3672`.

Təqvim məlumatları əvvəlki kimi 74 bölgə üçün 1 oktyabr–31 dekabr 2026 aralığını əhatə edir.
Play Console-a yükləmə və yayım edilməyib. Mağaza bəyannamələri və digər açıq buraxılış
maddələri üçün `../docs/release-checklist.md` və mövcud foreground-service materiallarına baxın.

## Təkrar yığma

```bash
npm run android:bundle
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

İstifadə olunan yoxlamalar Google-un
[bundletool](https://developer.android.com/tools/bundletool) və
[16 KB səhifə ölçüsü](https://developer.android.com/guide/practices/page-sizes) sənədlərinə əsaslanır.
