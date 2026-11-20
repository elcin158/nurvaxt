# NurVaxt 1.0.20 (24) — Google Play test AAB-si

Play Console-dakı mövcud test kanalına yükləmək üçün imzalanmış Android App Bundle hazırdır.

- Fayl: `nurvaxt-1.0.20-v24.aab`
- Paket: `az.nurvaxt.app`
- Versiya: `1.0.20`; version code: `24` (əvvəlki `23`-dən böyükdür).
- Ölçü: 77,621,834 bayt (74.03 MiB).
- SHA-256: `df1b2c230523309403502f5f155853e48e6c8edc24705cf3a6684d6a04ff68d1`
- İmzalama sertifikatı əvvəlki 1.0.19 (23) buraxılışı ilə eynidir.
- Dörd arxitektura: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
- Min SDK: 24; target SDK: 36.

7 widget dizaynı, açıq/tünd tema, sahəni tam dolduran görünüş və ikonları çıxarılmış
vaxt siyahıları bu versiyaya daxildir. Bütün 14 widget provider-i, ortaq dizayn faylı
və şriftlər AAB daxilində yoxlanılıb.

Play Console üçün yenilik mətni: `google-play/release-notes-1.0.20-az.txt` (372/500 simvol).
Mətn tətbiqin “Yeniliklər” bölməsi və yerli `updates.json` ilə eynidir.
`updates.json` bu işdə GitHub-a göndərilməyib.

240 tətbiq testi, 23 test dəsti və 30 native unit testi keçib.
Typecheck, lint, format, bundletool, imza, 16 KB uyğunluğu, cihaz filtrləri,
paketdəki JavaScript, məlumat bazası, dörd xatırlatma səsi və widget resursları yoxlanılıb.
Lint-də əvvəlcədən mövcud 1 xəbərdarlıq var; xəta yoxdur.

Widget-lərin eyni mənbədən yığılmış 1.0.19 (23) lokal APK-sında 14 variant,
ölçü dəyişiklikləri, boşluqsuz görünüş və ana ekrana əlavə etmə bu çatda yoxlanılıb.
1.0.20 (24) AAB-si üçün ayrıca fiziki cihaz və Play Store-dan quraşdırma sınağı aparılmayıb.

Bu işdə AAB hazırlanıb; Play Console-a yükləmə və yayımlama aparılmayıb.
AAB və imzalama açarı Git-ə daxil edilmir.

Ətraflı hesabat: `../docs/releases/1.0.20/verification.json`.
