# Yeni il üçün cədvəl yeniləməsi

8 oktyabr 2026 tarixində QMİ-nin rəsmi seçimində yalnız 2025 və 2026 var.
2027 vaxtlarını əvvəlki ildən köçürmək və ya hesablamaq olmaz. Hazırkı APK-də
Bakı üçün 1 oktyabr–31 dekabr 2026 məlumatları var.

QMİ 2027 cədvəlini dərc edəndə, ilin sonunu gözləmədən bu ardıcıllıqla yeniləyirik:

1. Rəsmi formadan dərc edilmiş ayları endiririk. Seçimdə olmayan il üçün importer dayanır.
2. Şəkildəki bütün vaxtları yoxlayıb hər ay üçün ayrıca review faylı hazırlayırıq.
3. 2027 JSON/SQLite paketini yaradırıq; 2026 paketi də arxiv və əvvəlki tarixlər üçün qalır.
4. Tətbiqin versiyasını və Android `versionCode` dəyərini artırıb eyni imza açarı ilə yeni APK hazırlayırıq.
5. İstifadəçi yeniləməni quraşdırır. 1 yanvarda tətbiq cihazın tarixinə uyğun 2027 məlumatlarını seçir.

Rəsmi yanvar cədvəli mövcud olduqdan sonra nümunə əmrlər:

```bash
npm run prayer:import -- --year 2027 --acquire --locations qmi-1 --months 1
# Endirilmiş şəkil yoxlanır və baku-2027-01.review.json hazırlanır.
npm run prayer:import -- --year 2027 \
  --review data/review/baku-2027-01.review.json --version 2027.01-baku.1
npm run prayer:validate -- --year 2027
npm run prayer:build-db -- --year 2027
# package.json, lockfile və app.config.ts versiyası / versionCode artırılır.
npx expo prebuild --no-install
npm run android:release -- -PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64
python3 scripts/verify-release-apk.py
```

Bütün 12 ay hazırdırsa, `--months` parametrini vermədən hamısı endirilə bilər;
import zamanı hər ayın review faylı ayrıca `--review` ilə daxil edilməlidir.
Yarımçıq ili sonradan genişləndirəndə `--replace` ilə əvvəlki və yeni ayların hamısı
verilir. Əvvəlki paket hash adı ilə arxivlənir.

Hazırkı tətbiq internetdən avtomatik illik cədvəl endirmir. 2027-ni ehtiva edən
yeniləmə quraşdırılmasa, həmin tarixlər üçün “Bu tarix üçün təqvim yoxdur” göstərilir
və namaz vaxtları uydurulmur. Tətbiq açılarkən və yenidən aktivləşərkən bildiriş planı
mövcud, yoxlanmış tarixlərdən yenilənir.

`.signing/nurvaxt-release.keystore` və `.signing/keystore.properties` fayllarını
təhlükəsiz ehtiyat nüsxədə saxlayın. Eyni açarla imzalanmış daha böyük versionCode
olan APK mövcud release üzərinə quraşdırılır və yerli seçimləri saxlayır.
İmza dəyişsə, Android yeniləməni qəbul etmir.

Gələcəkdə etibarlı imza və checksum yoxlaması olan məlumat yeniləmə xidməti qurularsa,
yeni il üçün ayrıca APK ehtiyacı aradan qaldırıla bilər. Bu mexanizm hazırkı versiyada yoxdur.
