# NurVaxt — Dünya üzrə uşaq auditoriyası üçün ilkin yoxlama

Yoxlama tarixi: 14 oktyabr 2026.

Yoxlanılan yerli Android release APK: 1.0.6, versionCode 7.

SHA-256: `01751c2b6fcc6a5b5df43af6bc58248510c3dca3e7e45edefac5a50099010bae`.

Bu yoxlama tətbiqin mənbə kodunu, yerli APK-nin manifestini və resurslarını, Google Play Families qaydalarını və ABŞ/Aİ üzrə əsas məlumat tələblərini əhatə edir. Play Console-a yüklənmiş paket ayrıca yoxlanılmayıb. Bütün ölkələrin qanunları üzrə hüquqi uyğunluq təsdiqi verilməyib.

## Təsdiqlənən texniki davranış

| Mövzu                   | Nəticə                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reklam və analitika     | Tətbiq kodunda reklam, analitika və davranış izləmə inteqrasiyası tapılmadı.                                                                                               |
| Hesab və alışlar        | Hesab, ödəniş, tətbiqdaxili alış və istifadəçilərarası çat yoxdur.                                                                                                         |
| Təqvim                  | Tətbiqlə birlikdə gələn yerli məlumat paketindən oxunur.                                                                                                                   |
| Ayarlar və diaqnostika  | Cihazda saxlanılır; tətbiqin kodunda avtomatik serverə göndərmə tapılmadı.                                                                                                 |
| Məkan                   | Standart qiblə rejimi şəhər mərkəzidir. Cihaz məkanı könüllü seçimdir; Android-də yalnız təxmini məkan icazəsi var. Koordinatlar tətbiq tərəfindən daimi yaddaşa yazılmır. |
| Həssas icazələr         | Yoxlanılan APK-də dəqiq/arxa plan məkan, kamera, mikrofon, kontakt və reklam ID icazələri yoxdur.                                                                          |
| Sensorlar               | Kompas üçün maqnit və hərəkət göstəriciləri cihazda emal olunur; tətbiq kodunda saxlanma və serverə göndərmə yoxdur.                                                       |
| Paylaşma                | Sistem paylaşma menyusuna şəhər, tarix, namaz vaxtları və mənbə adı verilir. Cihaz məkanının koordinatları daxil edilmir.                                                  |
| Android ehtiyat nüsxəsi | APK-də avtomatik ehtiyat nüsxələmə söndürülüb.                                                                                                                             |

Əsas mənbələr: `app.config.ts`, `src/store/preferences.ts`, `src/features/qibla/usePreciseOrigin.ts`, `src/features/qibla/useCompassHeading.ts`, `src/features/notifications/service.ts`, `src/features/prayer-times/PrayerTimesShareButton.tsx` və yerli release APK-nin manifesti/resursları.

Bu nəticələr kod və paket yoxlamasına əsaslanır. İşləyən tətbiqin bütün şəbəkə trafiki ölçülməyib; əməliyyat sisteminin məkan xidmətlərinin daxili davranışı da bu yoxlamanın əhatəsinə daxil deyil.

## Bildiriş SDK-sı barədə dəqiqləşdirmə

`expo-notifications` Android paketinə Firebase Messaging kitabxanasını daxil edir. Kitabxananın mövcudluğu onun aktiv xidmət kimi konfiqurasiya edildiyini göstərmir: tətbiqdə push token alma çağırışları və Firebase-in proqramla ilkinləşdirilməsi tapılmadı. Yoxlanılan APK-də `google_app_id`, `google_api_key`, `gcm_defaultSenderId` və `firebase_database_url` resursları yoxdur.

Firebase xidmətləri ilkinləşdirmə üçün uyğun layihə, tətbiq və API konfiqurasiyası tələb edir. Aktiv FCM qeydiyyatı zamanı identifikator və konfiqurasiya məlumatları ötürülə bilər. Gələcəkdə Firebase konfiqurasiyası əlavə edilərsə, bu nəticələr və Data safety bəyannaməsi yenidən yoxlanmalıdır. [Firebase ilkinləşdirməsi](https://firebase.google.com/support/guides/init-options), [FCM avtomatik ilkinləşdirməsi](https://firebase.google.com/docs/cloud-messaging/android/get-started#prevent_auto_initialization)

## Yaş qrupları və Families bəyannaməsi

Google seçilən hər yaş qrupunun həqiqətən hədəflənməsini və tətbiqin həmin istifadəçilər üçün uyğun olmasını tələb edir. Uşaqların auditoriyaya daxil edilməsi məlumat, SDK, məzmun və digər Families tələblərini tətbiq edir. Reklamın olmaması reklam üzrə tələbləri sadələşdirir; digər tələblər qüvvədə qalır. [Google Play Families](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)

NurVaxt-ın hazırkı onboarding, şəhər seçimi, təqvim və ayarları mətnlə oxuma və qərar vermə tələb edir. Məktəbəqədər uşaqlarla istifadə yoxlaması aparılmayıb. Buna görə bütün yaşlara, xüsusən “5 and under” qrupuna uyğunluq bu texniki yoxlama ilə təsdiqlənmir. “9–12” və daha yuxarı qruplar mövcud interfeys üçün daha əsaslandırıla bilən ilkin seçim kimi görünür; faktiki auditoriya qərarı məhsulun məqsədinə əsaslanmalıdır.

## Dünya üzrə yayımda açıq qalan məlumat məsələləri

ABŞ COPPA qaydasında uşağın e-poçt ünvanı onlayn əlaqə məlumatıdır. Qaydanın tətbiq olunduğu halda birdəfəlik cavab istisnasının şərtlərindən biri məlumatın cavabdan sonra tez silinməsidir. Təkrar əlaqə üçün ayrıca şərtlər var. Uşaqlardan onlayn toplanan fərdi məlumatlar üçün yazılı saxlanma və silinmə qaydası da tələb olunur. Mövcud NurVaxt siyasətində dəstək yazışmaları üçün ümumi saxlanma izahı var; uşaqlardan gələn müraciətlər ayrıca tənzimlənmir. [COPPA §312.5 və §312.10](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)

Aİ-də uşaqların fərdi məlumatlarının razılığa əsaslanan emalı üçün valideyn razılığı həddi üzv ölkədən asılı olaraq 13–16 yaş arasında dəyişir. Bu, bütün uşaqlardan tətbiqdən istifadə üçün avtomatik valideyn razılığı alınması demək deyil; tələbin tətbiqi faktiki məlumat emalından asılıdır. “13+” seçimi dünya üzrə bütün uşaq məlumat qaydalarını həll etmir. [Avropa Komissiyasının izahı](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en)

## Dəstək qaydası üçün nəzərdən keçiriləcək mətn

Aşağıdakı mətn təklifdir. Operator bunu həqiqətən həyata keçirəcəyi qayda kimi qəbul etmədən, tətbiqə və açıq məxfilik səhifəsinə əlavə edilməməlidir. Bu maddə təkbaşına bütün ölkələr üzrə uyğunluğu təmin etmir.

> Uşaqların dəstək müraciətlərini valideyn və ya qəyyum vasitəsilə göndərməsini xahiş edirik. Müraciətə uşağın tam adı, məktəbi, ünvanı, şəkli və dəqiq məkanı kimi məlumatları əlavə etməyin. 13 yaşdan kiçik uşağın özü bizə yazdığı məlum olduqda, birdəfəlik cavab vermək üçün istifadə olunan əlaqə məlumatını cavabdan sonra gecikmədən silirik və uşağın ünvanından sonrakı əlaqə və ya reklam üçün istifadə etmirik. Davamlı dəstək müraciətlərini valideyn və ya qəyyum vasitəsilə aparırıq. Lazımsız fərdi məlumatları saxlamırıq. Valideyn və qəyyumlar uşaqlarına aid məlumatın silinməsi üçün agayevelcinn@gmail.com ünvanına müraciət edə bilərlər.

Bu qayda qəbul edilərsə, silinmə gələn məktub, göndərilən cavab, ayrıca çıxarılmış qeydlər və bərpa edilə bilən surətlər üzrə tətbiq edilməlidir. Təklif mövcud e-poçt hesabında heç bir məktubu dəyişdirmir və silmir.

## Nəticə

Yoxlanılan tətbiq kodunda və yerli Android paketində Families qaydalarına açıq texniki ziddiyyət tapılmadı. Bu nəticə bütün SDK şərtləri, hüquqi əsaslar, ölkələr və yaş qrupları üzrə tam uyğunluq təsdiqi deyil.

Play Console-dakı hüquqi uyğunluq xanasını təsdiqləmədən əvvəl dəstək məlumatlarının faktiki işlənmə qaydası, məxfilik mətninin həmin qaydaya uyğunluğu, seçilən yaşların məhsulla uyğunluğu və tətbiq olunan digər ölkə tələbləri müəyyən edilməlidir. Yalnız bu xananı keçmək məqsədilə auditoriyanı dəyişmək düzgün əsas deyil.
