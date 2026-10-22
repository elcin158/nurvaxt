# NurVaxt 1.0.11 — Play Store test buraxılışı

22 oktyabr 2026. Paket: `az.nurvaxt.app`; versiya: **1.0.11**; `versionCode`: **14**.

## Hazır fayllar

- **Play Console üçün:** `nurvaxt-1.0.11-v14.aab` — 59.25 MiB.
- **Yenilik mətni:** `google-play/release-notes-1.0.11-az.txt` — 249 simvol.
- **Birbaşa quraşdırma üçün:** `nurvaxt-1.0.11-release.apk` — 79.01 MiB; yoxlanmış AAB-dən çıxarılıb.
- **Paket yoxlamaları:** `nurvaxt-1.0.11-v14.validation.json`, `nurvaxt-1.0.11-release.json`.
- **Ümumi hesabat:** `../docs/releases/1.0.11/verification.json`.

Mövcud Play test kanalına AAB faylı və yenilik mətni əlavə edilə bilər.
Play Console-a yükləmə və yayım edilməyib. Versiya kodu yerli son buraxılışın
13 kodundan 14-ə artırılıb; Console-dakı istifadə olunmuş kodlar ayrıca oxunmayıb.

## Dəyişikliklər

- Canlı bildirişin vaxt zolağı parlaq göy/mavi görünüş, kölgə və daha qalın xətt ilə yenilənib.
- Cari mövqe ağ haşiyəli tünd dairə ilə göstərilir; kərahət intervalları qırmızı rəngdə qalır.
- Namaz adı və saniyəlik geri sayım daha iri və qalın, namazın saatı isə yumşaq rəngdə göstərilir.
- Kiçik ekranlarda və 200% sistem şriftində uzun geri sayımın yerləşməsi düzəldilib.

Paket cari iş qovluğundakı tətbiq dəyişikliklərini ehtiva edir.
Mənbə commit-i və 146 tətbiq/build faylının SHA-256 dəyərləri yoxlama qovluğunda qeyd edilib.
Mağaza şəkillərinin `source/capture-metadata.json` faylı əvvəlki çəkilişin həqiqi
1.0.10 versiyasını göstərir; həmin interfeys bu buraxılışda da saxlanılır.

## Yoxlamalar

TypeScript, ESLint, **166 JavaScript testi** (16 suite), **24 native unit testi**
(5 suite), release yığılması və `lintVitalRelease` uğurla keçib.
Native unit testləri yenidən icra olunub.

Ayrıca **NurVaxt_Store / Android 15** emulyatorunda **14 bildiriş testi** keçib:
açıq/tünd görünüş, 12/24 saat formatı, 260/320/390 dp en, 100/200% şrift,
geri sayımın yerləşməsi, parlaq zolaq və kərahət mərhələləri yoxlanıb.

AAB üçün bundletool yoxlaması, əvvəlki buraxılışla imza açarının uyğunluğu,
paket versiyası, icazələr, offline verilənlər bazası və 48 ədəd 64 bit native
kitabxananın 16 KB ELF düzləndirilməsi təsdiqlənib. AAB-dən çıxarılmış APK-nin
imzası, 16 KB ZIP düzləndirilməsi, dörd bildiriş səsi və bildiriş resursları da yoxlanıb.

Həmin APK ilə 1.0.10 / kod 13-dən yenilənmə, bütün ayarların qorunması,
internetsiz açılış və real geri sayım bildirişi yoxlanıb. Quraşdırılmış bazadakı
**6 808 sətir / 61 272 vaxt dəyəri / 74 bölgə** mənbə bazası ilə tam uyğun gəlib.
Əsas ekran və bildiriş şəkilləri vizual yoxlanıb; fatal runtime xətası qeydə alınmayıb.
Mövcud Lenovo emulyatoruna və fiziki cihazlara müdaxilə edilməyib.

Bu paket fiziki cihazda, 16 KB səhifəli cihazda və Play vasitəsilə
quraşdırma/yenilənmə axınında sınanmayıb.

AAB SHA-256:
`91e3f91a1f746c44c287d68149c5d490aece362c543ad47ed2424906a7e3dc46`.

İmza sertifikatının SHA-256 izi:
`01e6e344bf078c3928dd2079192c6243636400a1916d494427eadc64e474e86e`.

## Təkrar yığma

```bash
npm run android:bundle -- -PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64
python3 scripts/verify-release-bundle.py --bundletool /absolute/path/to/bundletool-all-1.18.1.jar
```

AAB və APK git-də saxlanılmır. Mövcud `.signing/` açarı növbəti buraxılışlarda da istifadə edilməlidir.
