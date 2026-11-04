# NurVaxt 1.0.19 (23) — Google Play test AAB-si

Play Console-un test kanalına yükləmək üçün imzalanmış Android App Bundle hazırdır.

- Fayl: `nurvaxt-1.0.19-v23.aab`
- Paket: `az.nurvaxt.app`
- Versiya: `1.0.19`; version code: `23` (əvvəlki `22`-dən böyükdür).
- Ölçü: 76,155,550 bayt (72.63 MiB).
- SHA-256: `97ea1a952021dc035e67b6e5734670af936ff147c27a752d669253dfe0198d49`
- İmzalama sertifikatı əvvəlki 1.0.18 (22) buraxılışı ilə eynidir.
- Dörd arxitektura: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
- Min SDK: 24; target SDK: 36.

“Yenilə” düyməsi görünəndə şəhər seçimi və paylaşma düyməsi eyni sətirdə qalır.
Yer çatmadıqda şəhər adı qısaldılır.

Yenilik mətni: `google-play/release-notes-1.0.19-az.txt`.
Bu mətn tətbiqin “Yeniliklər” bölməsi və GitHub-dakı `updates.json` ilə eynidir.

Bundletool, imza, 16 KB uyğunluğu, əvvəlki buraxılışla cihaz filtrləri,
paketdəki JavaScript, buraxılış mətni, məlumat bazası və dörd xatırlatma səsi yoxlanılıb.
224 test və 20 test dəsti keçib; typecheck və lint xəta verməyib.
Lint-də əvvəlcədən mövcud 1 xəbərdarlıq var.

Yalnız release AAB hazırlanıb; lokal APK yaradılmayıb. Play Console-a yükləmə,
fiziki cihaz və Play Store-dan quraşdırma sınağı aparılmayıb.
AAB və imzalama açarı Git-ə daxil edilmir; kod, yenilik mətnləri və yoxlama
hesabatları repozitoriyada saxlanılır.

Ətraflı hesabat: `../docs/releases/1.0.19/verification.json`.
