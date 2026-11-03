# NurVaxt 1.0.18 (22) — Google Play test AAB-si

Play Console-un test kanalına yükləmək üçün imzalanmış Android App Bundle hazırdır.

- Fayl: `nurvaxt-1.0.18-v22.aab`
- Paket: `az.nurvaxt.app`
- Versiya: `1.0.18`; version code: `22` (əvvəlki `21`-dən böyükdür).
- Ölçü: 76,155,491 bayt (72.63 MiB).
- SHA-256: `780e4e2e50fc7631dc6e63060c9087b180781b0b858cbbdab72d0ec38cc28cf0`
- İmzalama sertifikatı əvvəlki 1.0.17 (21) buraxılışı ilə eynidir.
- Dörd arxitektura: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
- Min SDK: 24; target SDK: 36.

Yeni versiyanın yenilik mətnləri əvvəlki keşdə olmadıqda dərhal yüklənir.
Əlçatmaz mətnlər bir dəqiqə sonra təkrar yoxlanıla bilir. Yenilik məlumatı
olmadıqda əlavə “Play Store-da bax” keçidi çıxarılıb.

Yenilik mətni: `google-play/release-notes-1.0.18-az.txt`.

Bundletool, imza, 16 KB uyğunluğu, əvvəlki buraxılışla cihaz filtrləri,
paketdəki JavaScript, buraxılış mətni, çıxarılan keçid mətninin olmaması,
məlumat bazası və dörd xatırlatma səsi yoxlanılıb.
224 test və 20 test dəsti keçib; typecheck və lint xəta verməyib.
Lint-də əvvəlcədən mövcud 1 xəbərdarlıq var.

Yalnız release AAB hazırlanıb; test APK yaradılmayıb. Play Console-a yükləmə,
fiziki cihaz və Play Store-dan quraşdırma sınağı aparılmayıb.
AAB və imzalama açarı Git-ə daxil edilmir; kod, yenilik mətnləri və yoxlama
hesabatları repozitoriyada saxlanılır.

Ətraflı hesabat: `../docs/releases/1.0.18/verification.json`.
