# NurVaxt — Google Play üçün hazır fayllar

ZIP-i aç, sonra Play Console-da **Add assets** vasitəsilə uyğun faylları seç.

| Play Console bölməsi | Yüklənəcək fayl və ya qovluq | Ölçü |
| --- | --- | --- |
| App icon | `app-icon-512.png` | 512 × 512 |
| Feature graphic | `feature-graphic-1024x500.png` | 1024 × 500 |
| Phone screenshots | `phone/` qovluğundakı 5 PNG | 1080 × 1920 |
| 7-inch tablet screenshots | `tablet-7/` qovluğundakı 4 PNG | 1440 × 2560 |
| 10-inch tablet screenshots | `tablet-10/` qovluğundakı 4 PNG | 1440 × 2560 |

Hər qrupda şəkilləri adındakı 01, 02, 03, 04, 05 sırasına görə əlavə et.
Telefon üçün beşinci şəkil tünd görünüşü göstərir. Digər ekranlar namaz vaxtları,
təqvim, qiblə və xatırlatmalardır.

## Video — istəyə bağlı

`nurvaxt-preview-30s.mp4` — 30 saniyə, 1920 × 1080, 16:9, H.264, səssiz tanıtım videosu.
Tətbiqin real işləyən ekranları göstərilir.

1. Videonu öz YouTube kanalına yüklə.
2. Görünürlük üçün **Public** və ya **Unlisted** seç.
3. Reklam/monetizasiyanı söndür və yaş məhdudiyyəti qoyma.
4. Videonun `https://www.youtube.com/watch?v=...` linkini Play Console-dakı **Video** sahəsinə daxil et.

Video YouTube-a hələ yüklənməyib. Bu sahəni boş qoyaraq da davam edə bilərsən.

## Digər fayllar

- `preview.jpg` — bütün ekran şəkillərinə birlikdə baxmaq üçündür; Play Console-a yüklənmir.
- `store-listing-az.md` — əvvəl hazırlanmış tətbiq adı, qısa və tam açıqlama.
- `validation.json` — ölçü, rəng kanalı və fayl həcmi yoxlaması.
- `source/` — təkrar ixrac üçün skriptlər, redaktə edilə bilən SVG və ilkin video; Play Console-a yüklənmir.

İkon 32-bit PNG, digər yüklənəcək şəkillər şəffaflığı olmayan 24-bit RGB PNG-dir.
Ekran şəkillərinin nisbəti 9:16-dır; bütün qruplarda ən azı dörd şəkil və ən qısa tərəfdə
ən azı 1080 piksel var. Faylların hamısı müvafiq həcm limitindən kiçikdir.

Şəkillər cari NurVaxt 1.0.6 release build-indən Android 15 emulyatorunda ayrıca telefon,
720 dp və 960 dp enli planşet görünüşləri ilə çəkilib. Telefon şəkilləri böyüdülərək
planşet şəkli kimi istifadə edilməyib. Ekranlar Bakı üçün 14 oktyabr 2026 tarixini göstərir.

Çəkilişdə istifadə edilən APK-nın SHA-256 dəyəri:
`fba6474757172729c18beacecd100b76fbbb098b8f14c73461b69ba10a460adc`

Cari təqvim məlumatları 1 oktyabr–31 dekabr 2026 tarixlərini əhatə edir; bu sərhəd
mağaza açıqlamasında göstərilib.

[Google Play qrafik və video tələbləri](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
