# NurVaxt — premium tanıtım videosu

22 oktyabr 2026. Azərbaycan dili. **30 saniyə, Full HD, 30 fps.**

## Hazır videolar

| Fayl | Ölçü | İstifadə |
| --- | --- | --- |
| `nurvaxt-premium-1920x1080-30s.mp4` | 1920 × 1080, 16:9 | YouTube və Google Play tanıtımı üçün üfüqi montaj |
| `nurvaxt-premium-1080x1920-30s.mp4` | 1080 × 1920, 9:16 | Telefonda tam ekran izləmə üçün şaquli montaj |

Hər iki video ayrıca kompozisiya ilə hazırlanıb. H.264 / yuv420p, BT.709, AAC stereo 48 kHz, 256 kbit/s; internetdə tez başlamaq üçün `faststart`. İri Azərbaycan dilində başlıqlar, orijinal sakit instrumental fon, yumşaq keçidlər və real Android ekran yazıları var. Səsləndirmə yoxdur; əsas məzmun səssiz də anlaşılır.

- `youtube-thumbnail-1920x1080.jpg` — YouTube örtük şəkli.
- `portrait-cover-1080x1920.jpg` — şaquli örtük şəkli.
- `nurvaxt-az.srt` — Azərbaycan dilində əlavə altyazı faylı.
- `landscape-storyboard.jpg`, `portrait-storyboard.jpg` — son videolardan götürülmüş yoxlama kadrları.
- `validation.json` — video, səs, müddət, kadr sayı və fayl hash yoxlaması.

## Səhnələr

| Vaxt | Məzmun |
| --- | --- |
| 00–06 | Hər gün, vaxtında — namaz vaxtları və canlı geri sayım |
| 06–12 | Qalan vaxt, bir baxışda — Android bildirişi |
| 12–18 | Qibləni asanlıqla tapın — qiblə kompası |
| 18–24 | Xatırlatmalar, sizə uyğun — həqiqi düymələrlə 5 və 15 dəqiqəlik seçimlərin əlavə edilməsi |
| 24–28 | Gecəyə uyğun sakit görünüş — tünd rejim |
| 28–30 | NurVaxt — Hər gün, vaxtında |

## Google Play-a əlavə etmək

1. Üfüqi MP4 faylını öz YouTube kanalınıza yükləyin. Görünürlük **Public** və ya **Unlisted** olsun.
2. Reklam/monetizasiyanı söndürün, yerləşdirməyə (embedding) icazə verin və yaş məhdudiyyəti qoymayın.
3. Play Console-da mağaza səhifəsinin **Preview video / Tanıtım videosu** sahəsinə videonun adi YouTube linkini əlavə edin. Kanal, pleylist və ya vaxt parametri olan link istifadə etməyin.
4. İstəsəniz, `nurvaxt-az.srt` faylını Azərbaycan dili altyazısı kimi əlavə edin.

Google Play videonu YouTube linki ilə qəbul edir. Həm üfüqi, həm şaquli format dəstəklənir. İlk 30 saniyə səssiz avtomatik oynadıla bilər. Bu qaydalar 22 oktyabr 2026 tarixində [Google Play Console-un rəsmi təlimatından](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) yoxlanılıb.

Bu iş yalnız yerli video fayllarını hazırlayıb; YouTube və Play Console-a yayım edilməyib.

YouTube başlığı:

> NurVaxt — Hər gün, vaxtında | Namaz vaxtları və qiblə

YouTube təsviri:

> NurVaxt — Azərbaycan üçün namaz vaxtları, qiblə və gündəlik xatırlatmalar. Növbəti namaza qalan vaxtı tətbiqdə və Android bildirişində izləyin, xatırlatmaları özünüzə uyğun seçin. Açıq və tünd görünüşlə gündəlik istifadə üçün hazırlanıb.

## Görüntü və səsin mənşəyi

Ekran yazıları **NurVaxt 1.0.12 (versionCode 15)** imzalı release APK-sından, yalnız bu çəkiliş üçün yaradılmış **NurVaxt_Store / Android 15** emulyatorundan götürülüb. Bakı, 22 oktyabr 2026 və tətbiqin mövcud rəsmi təqvim məlumatları göstərilir. Cari APK-nın hash-i və xam faylların hash-ləri `source/capture-manifest.json` faylındadır.

Status və naviqasiya zolaqları kəsilib; Android bildirişi real kart sərhədlərinə görə kəsilib. Ekranların nisbətləri qorunub. Tətbiqdəki vaxtlar, mətnlər və interfeys elementləri yenidən çəkilməyib. Qiblənin hərəkətsiz ekranı real çəkiliş kadrını saxlayır. Arxa plandakı müşayiətçi əsas ekran ayrıca çəkilişdir.

Musiqi bu video üçün `source/soundtrack.py` ilə sintez olunmuş orijinal ambient kompozisiyadır. Xarici musiqi nümunəsi və ya səs yazısı istifadə edilməyib. Manrope şrifti tətbiqin mövcud font paketindəndir; lisenziya `node_modules/@expo-google-fonts/manrope/LICENSE_FONT` daxilindədir.

## Təkrar ixrac

Repo kökündən aşağıdakı alətləri ayrıca müvəqqəti qovluğa quraşdırın. Tətbiqin `package.json` faylı dəyişmir:

```bash
npm install --prefix /tmp/nurvaxt-premium-tools --no-audit --no-fund @napi-rs/canvas@1.0.13 ffmpeg-static@5.3.0 ffprobe-static@3.1.0
node artifacts/google-play/premium-video/source/prepare.mjs
node artifacts/google-play/premium-video/source/render.mjs
node artifacts/google-play/premium-video/source/render.mjs --portrait
node artifacts/google-play/premium-video/source/validate.mjs
```

Xam çəkilişlər, kəsilmiş ekranlar və səs masteri `source/` daxilində saxlanılıb. Müvəqqəti `source/frames/` kadrları `prepare.mjs` ilə yenidən hazırlanır. İlkin kompozisiya kadrlarına baxmaq üçün render əmrinə `--preview` əlavə edin. Səsi yenidən yaratmaq üçün NumPy olan Python mühitində `source/soundtrack.py` işlədin.

Yeni çəkiliş üçün `source/capture.py` yalnız `emulator-5558` ünvanlı, **NurVaxt_Store** adlı ayrıca emulyatorda işləyir. Cari release APK quraşdırılmış və açılmış, `adb root` aktiv olmalıdır. `prepare`, `home`, `notification`, `qibla`, `reminders`, `dark` əmrlərini ardıcıllıqla çağırın. Skript yalnız həmin test emulyatorunun saatını və ayarlarını dəyişir.
