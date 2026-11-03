# NurVaxt 1.0.16 (20) — Google Play test AAB-si

Play Console-da mövcud test kanalına yükləmək üçün imzalanmış Android App Bundle hazırdır.

- Fayl: `nurvaxt-1.0.16-v20.aab`
- Paket adı: `az.nurvaxt.app`
- Versiya: `1.0.16`
- Version code: `20` (Play Store-dakı `1.0.15 (19)` buraxılışından böyükdür)
- Ölçü: 76,155,777 bayt (72.63 MiB)
- SHA-256: `b50553f11788ef8ee0c0b841257144744c98a35bb98a9f3e1fc2d25979d030ea`
- İmzalama sertifikatı əvvəlki v19 buraxılışı ilə eynidir.
- Dörd arxitektura: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
- Min SDK: 24; target SDK: 36.

Yenilik mətni: `google-play/release-notes-1.0.16-az.txt`.

Bundletool, imza, 16 KB uyğunluğu, əvvəlki versiya ilə cihaz filtrləri,
paketdəki JavaScript, GitHub yenilik ünvanı, buraxılış mətnləri, məlumat bazası
və dörd xatırlatma səsi yoxlanılıb. 222 test və 20 test dəsti keçib;
typecheck və lint xəta verməyib. Lint-də əvvəlcədən mövcud bir xəbərdarlıq var.

Yalnız AAB hazırlanıb. Test APK yaradılmayıb və Play Console-a yükləmə edilməyib.
Fiziki cihazda və Play Store-dan quraşdırma sınağı bu hazırlama mərhələsində aparılmayıb.

Ətraflı hesabat: `../docs/releases/1.0.16/verification.json`.
