# NurVaxt — Google Play şəkilləri

## 22 oktyabr 2026 — cari telefon görüntüləri

`phone/` qovluğundakı səkkiz PNG cari iş qovluğundan yığılmış **NurVaxt 1.0.10 (versionCode 13)** release tətbiqindən hazırlanıb. Şəkillər 1080 × 1920, 24-bit RGB PNG formatındadır; adındakı nömrə sırası ilə əlavə edilir.

| Sıra | Fayl | Görüntü |
| --- | --- | --- |
| 01 | `phone/01-namaz-vaxtlari.png` | Beş gündəlik namaz və cari geri sayım |
| 02 | `phone/02-canli-bildiris.png` | Genişləndirilmiş Android bildirişi və yeni parlaq vaxt zolağı |
| 03 | `phone/03-qible.png` | Cari qiblə kompası və istiqamət məlumatları |
| 04 | `phone/04-xatirlatmalar.png` | Namazdan əvvəl xatırlatma seçimləri |
| 05 | `phone/05-tund-gorunus.png` | Cari əsas ekranın tünd görünüşü |
| 06 | `phone/06-kerahet-vaxtlari.png` | Aktiv zəval kərahəti və üç təxmini interval |
| 07 | `phone/07-kerahet-bildirisi.png` | Bildirişdə qırmızı interval və kərahətin bitməsinə qalan dəqiqələr |
| 08 | `phone/08-kerahet-ayarlari.png` | Günçıxma, zəval və günbatımı müddətlərinin ayrıca seçilməsi |

Cari tətbiqdə ayrıca təqvim bölməsi olmadığı üçün əvvəlki `02-teqvim.png` çıxarılıb. Telefon şəkilləri və tanıtım banneri cari üç bölməli interfeysi göstərir.

Çəkilişlər ayrıca **NurVaxt_Store / Android 15** emulyatorunda, **Bakı · 22 oktyabr 2026** üçün aparılıb. Əsas çəkiliş vaxtı 15:30, aktiv zəval çəkilişləri 12:20-dir. Tətbiqin mövcud `visibleFields` ayarı ilə beş namaz göstərilib. Kərahət 06–08 şəkillərində aktivdir; müddətlər 45/10/45 dəqiqədir. 06 şəklində namaz siyahısı ilə kərahət kartını birlikdə göstərmək üçün sistem şrifti 115%, digər şəkillərdə 100% seçilib. İntervallar təxminidir.

Bildirişlər `az.nurvaxt.app` release paketinin həqiqi `CountdownService` xidmətindən və tətbiqin yoxlanmış Bakı məlumatlarından yaranıb. Test paketi və uydurma namaz cədvəli istifadə edilməyib. Hər bildiriş kartı UIAutomator sərhədləri ilə kəsilib, yanında tətbiq ekranı göstərilib. Tətbiq və bildiriş pikselləri dəyişdirilməyib; nisbətlər qorunub. Marketinq mətnləri və çərçivələr ekranın xaricindədir. Bildirişlər son APK-dakı parlaq, 12 dp qalınlıqlı zolağı və dairəvi göstəricini əks etdirir. Qiblə tanıtım başlığı “Qibləni asanlıqla tapın.” kimi yenilənib. Əvvəlki fon və seriyanın göy/açıq üslubu saxlanılıb.

## Hazır fayllar

- `phone-preview.jpg` — səkkiz telefon şəkli və yenilənmiş bannerin ümumi önizləməsi.
- `../nurvaxt-phone-redesign.zip` — səkkiz telefon PNG-si, banner, önizləmə, alternativ mətnlər və yoxlama nəticələri.
- `../nurvaxt-google-play-assets.zip` — bütün yerli Google Play fayllarının yenilənmiş paketi.
- `alt-text-az.md` — şəkillərin Azərbaycan dilində alternativ mətnləri.
- `validation.json` — ölçülər, rəng kanalları, fayl həcmləri və SHA-256 yoxlaması.
- `source/capture-metadata.json` — çəkiliş APK-sının SHA-256 dəyəri və çəkiliş ayarları.

Play Console-un **Phone screenshots** bölməsinə yalnız `phone/` qovluğundakı səkkiz PNG əlavə edilir. `phone-preview.jpg`, `preview.jpg` və `source/` yüklənmir.

## Təkrar hazırlamaq

İlkin ekran PNG-ləri `source/captures/phone/`, redaktə edilən kompozisiyalar `source/*.svg` daxilindədir. Mövcud çəkilişlərdən yenidən ixrac üçün:

```bash
node artifacts/google-play/source/build-assets.mjs
```

Yeni çəkiliş üçün `source/capture-campaign.py` yalnız `emulator-5558` ünvanındakı ayrıca **NurVaxt_Store** AVD-si ilə işləyir. Cari release APK quraşdırılıb bir dəfə açıldıqdan və `adb root` icra edildikdən sonra bu əmrlər ardıcıllıqla çağırılır:

```bash
python3 artifacts/google-play/source/capture-campaign.py prepare
python3 artifacts/google-play/source/capture-campaign.py home
python3 artifacts/google-play/source/capture-campaign.py qibla
python3 artifacts/google-play/source/capture-campaign.py reminders
python3 artifacts/google-play/source/capture-campaign.py dark
python3 artifacts/google-play/source/capture-campaign.py kerahat
python3 artifacts/google-play/source/capture-campaign.py notification
python3 artifacts/google-play/source/capture-campaign.py kerahat-notification
python3 artifacts/google-play/source/capture-campaign.py kerahat-settings
node artifacts/google-play/source/build-assets.mjs
```

Emulyatorun xam ölçüsü 1080 × 2160, sıxlığı 360 dpi-dir. Skript yalnız ayrıca emulyatorun saatını və ayarlarını dəyişir.

## Digər materiallar

`app-icon-512.png` 512 × 512, `feature-graphic-1024x500.png` 1024 × 500 ölçüsündədir.

`tablet-7/` və `tablet-10/` qovluqlarındakı dördər 1440 × 2560 PNG, eləcə də `nurvaxt-preview-30s.mp4` əvvəlki versiyanın çəkilişləridir. Onlar bu telefon yeniləməsinə daxil deyil və cari telefon interfeysini tam əks etdirmir. Video Play Console-a əlavə olunmaq üçün istifadəçinin YouTube kanalında yerləşdirilməlidir; hələ yüklənməyib.

`store-listing-az.md` mövcud mağaza mətnidir və bu şəkil yeniləməsi zamanı dəyişdirilməyib.
