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

## 16 oktyabr 2026 — yeni telefon dizaynı

`phone/` qovluğundakı beş şəkil və `feature-graphic-1024x500.png` yenidən hazırlanıb.
Göy və açıq fonlar, iri Azərbaycan dilində başlıqlar və tətbiqin real ekranları istifadə olunub.
Əsas ekranın açıq/tünd görünüşlərində və təqvimdə yalnız **Sübh, Zöhr, Əsr, Məğrib, İşa** var.
İmsak, Günçıxma, Günbatımı və Gecəyarısı çəkiliş emulyatorunda tətbiqin mövcud
`visibleFields` ayarı ilə gizlədilib. Tətbiqin standart ayarları və mənbə kodu dəyişdirilməyib.
Xatırlatmalar ekranı gündəlik namaz kartlarına qədər sürüşdürülüb; görünən hissədə İmsak yoxdur.

- `phone-preview.jpg` — beş yeni şəkil və bannerin birlikdə önizləməsi.
- `../nurvaxt-phone-redesign.zip` — yalnız yenilənmiş 5 telefon PNG-si, banner və alternativ mətnlər.
- `../nurvaxt-google-play-assets.zip` — yeni şəkilləri də ehtiva edən tam paket.
- `alt-text-az.md` — Play Console üçün Azərbaycan dilində alternativ mətnlər.

Telefon PNG-ləri 1080 × 1920, banner 1024 × 500 ölçüsündə, şəffaflığı olmayan RGB formatındadır.
Panel daxilindəki tətbiq ekranlarının nisbətləri qorunub; yalnız Android sistem zolaqları kəsilib.
Planşet görüntüləri və video əvvəlki çəkilişlərdir; bu yeniləməyə daxil edilməyib.

Təkrar ixrac:

```bash
node artifacts/google-play/source/build-assets.mjs
```

`source/captures/phone/` real ilkin PNG-ləri, `source/*.svg` redaktə edilən kompozisiyaları saxlayır.
Fon daxili **imagegen** aləti ilə hazırlanıb; tam prompt `source/imagegen-prompt.txt` faylındadır.
Təkrar ixrac imagegen, internet və ya emulyator tələb etmir; `sharp` və sistemdə Noto Sans şrifti kifayətdir.
Yeni çəkiliş üçün `source/capture-campaign.py` yalnız ayrıca `NurVaxt_Store` AVD-si ilə işləyir.
Bu AVD-də cari APK quraşdırılıb bir dəfə açıldıqdan və `adb root` icra edildikdən sonra
`prepare`, `home`, `calendar`, `qibla`, `reminders`, `dark` əmrləri ardıcıllıqla çağırılır.

Yeni telefon çəkilişlərinin APK SHA-256 dəyəri:
`9cca7cc066770f04908c684c44e0bc46ab199452c3ba3f153d26e9a4095cc6a1`.
Ekranlar Bakı üçün **16 oktyabr 2026** tarixini göstərir. Xam ölçü 1080 × 2160,
sıxlıq əsas ekranlarda 360 dpi, bütün beş sətrin görünməsi üçün təqvimdə 340 dpi-dir.

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

Əvvəlki planşet şəkilləri NurVaxt 1.0.6 release build-indən Android 15 emulyatorunda
720 dp və 960 dp enli planşet görünüşləri ilə çəkilib. Telefon şəkilləri böyüdülərək
planşet şəkli kimi istifadə edilməyib. Planşet ekranları Bakı üçün 14 oktyabr 2026 tarixini göstərir.

Əvvəlki planşet/video çəkilişində istifadə edilən APK-nın SHA-256 dəyəri:
`fba6474757172729c18beacecd100b76fbbb098b8f14c73461b69ba10a460adc`

Cari təqvim məlumatları 1 oktyabr–31 dekabr 2026 tarixlərini əhatə edir; bu sərhəd
mağaza açıqlamasında göstərilib.

[Google Play qrafik və video tələbləri](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
