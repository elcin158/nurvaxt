# NurVaxt 1.0.17 (21) — Google Play test AAB-si

Play Console-un test kanalına yükləmək üçün imzalanmış Android App Bundle hazırdır.

- Fayl: `nurvaxt-1.0.17-v21.aab`
- Paket: `az.nurvaxt.app`
- Versiya: `1.0.17`; version code: `21` (əvvəlki `20`-dən böyükdür).
- Ölçü: 76,155,593 bayt (72.63 MiB).
- SHA-256: `51e45ebbcf63befe6267bbbb707f5644c7654fd7f9d1ca58cca1b4648f7367d4`
- İmzalama sertifikatı əvvəlki 1.0.16 (20) buraxılışı ilə eynidir.
- Dörd arxitektura: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
- Min SDK: 24; target SDK: 36.

Yeniləmə panelindəki “Bütün yeniliklər” düyməsi çıxarılıb. Cari versiyanın
dəyişikliklərinə Ayarlar → Yeniliklər bölməsindən baxmaq olar.

Yenilik mətni: `google-play/release-notes-1.0.17-az.txt`.

Bundletool, imza, 16 KB uyğunluğu, əvvəlki buraxılışla cihaz filtrləri,
paketdəki JavaScript, buraxılış mətni, çıxarılan düymə mətninin olmaması,
məlumat bazası və dörd xatırlatma səsi yoxlanılıb.
221 test və 20 test dəsti keçib; typecheck və lint xəta verməyib.
Lint-də əvvəlcədən mövcud 1 xəbərdarlıq var.

Yalnız release AAB hazırlanıb; test APK yaradılmayıb. Play Console-a yükləmə,
fiziki cihaz və Play Store-dan quraşdırma sınağı aparılmayıb.

Ətraflı hesabat: `../docs/releases/1.0.17/verification.json`.
