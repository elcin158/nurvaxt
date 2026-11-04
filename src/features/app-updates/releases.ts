export type ReleaseItem = {
  icon: 'notifications-outline' | 'time-outline' | 'checkmark-circle-outline' | 'sparkles-outline';
  title: string;
  description: string;
};

export type ReleaseNotes = {
  versionCode: number;
  version: string;
  date: string;
  important: boolean;
  items: readonly ReleaseItem[];
};

// Add each published build here, using its exact Android versionCode. Only important
// releases introduce themselves after installation; small fixes stay in the history.
// Never substitute these installed-release notes for an unknown future Play update.
export const releases: readonly ReleaseNotes[] = [
  {
    versionCode: 23,
    version: '1.0.19',
    date: '2026-11-04',
    important: false,
    items: [
      {
        icon: 'checkmark-circle-outline',
        title: 'Əsas ekranda başlıq düzəlişi',
        description:
          '“Yenilə” düyməsi görünəndə şəhər seçimi və paylaşma düyməsi eyni sətirdə qalır. Yer çatmadıqda şəhər adı qısaldılır.',
      },
    ],
  },
  {
    versionCode: 22,
    version: '1.0.18',
    date: '2026-11-03',
    important: false,
    items: [
      {
        icon: 'checkmark-circle-outline',
        title: 'Yenilik mətnləri vaxtında göstərilir',
        description:
          'Yeni versiyanın dəyişiklikləri əvvəlki keşdən asılı olmadan yüklənir. Müvəqqəti əlçatmaz olduqda yenidən yoxlanılır.',
      },
      {
        icon: 'sparkles-outline',
        title: 'Daha yığcam yeniləmə paneli',
        description:
          'Dəyişiklik məlumatı olmadıqda əlavə mağaza keçidi çıxarılıb, məlumat mesajı saxlanılıb.',
      },
    ],
  },
  {
    versionCode: 21,
    version: '1.0.17',
    date: '2026-11-03',
    important: false,
    items: [
      {
        icon: 'checkmark-circle-outline',
        title: 'Daha sadə yeniləmə paneli',
        description:
          'Yeniləmə paneli sadələşdirildi. Cari versiyanın dəyişikliklərinə Ayarlar → Yeniliklər bölməsindən baxmaq olar.',
      },
    ],
  },
  {
    versionCode: 20,
    version: '1.0.16',
    date: '2026-11-03',
    important: true,
    items: [
      {
        icon: 'sparkles-outline',
        title: 'Yeniliklər yeniləmədən əvvəl',
        description: 'Yeni versiyadakı əlavələr və düzəlişlər birbaşa tətbiqdə göstərilir.',
      },
      {
        icon: 'checkmark-circle-outline',
        title: 'Daha rahat yeniləmə',
        description:
          'Yenilik mətninin yüklənməsi tətbiqin yenilənməsini ləngitmir. Saxlanmış yeniliklər internetsiz də oxunur.',
      },
    ],
  },
  {
    versionCode: 19,
    version: '1.0.15',
    date: '2026-11-02',
    important: false,
    items: [
      {
        icon: 'sparkles-outline',
        title: 'Cari versiyanın yenilikləri',
        description:
          '“Yeniliklər” bölməsi yalnız quraşdırılmış versiyada nələrin dəyişdiyini göstərir.',
      },
      {
        icon: 'checkmark-circle-outline',
        title: 'Daha aydın xatırlatma ayarları',
        description: 'Android-də iPhone-a aid vibrasiya qeydi çıxarılıb.',
      },
    ],
  },
  {
    versionCode: 18,
    version: '1.0.14',
    date: '2026-10-31',
    important: true,
    items: [
      {
        icon: 'sparkles-outline',
        title: 'Vahid yeniləmə paneli',
        description: 'Yeniliklər, yüklənmə gedişi və yenidən başlatma eyni paneldə göstərilir.',
      },
      {
        icon: 'checkmark-circle-outline',
        title: 'Daimi “Yenilə” nişanı',
        description: '“Sonra” seçildikdə nişan qalır və yeniləmə panelini yenidən açır.',
      },
      {
        icon: 'time-outline',
        title: 'Yeniliklər tarixçəsi',
        description:
          'Ayarlar → Yeniliklər bölməsi əlavə olundu. Vacib yeniliklər bir dəfə göstərilir.',
      },
    ],
  },
  {
    versionCode: 16,
    version: '1.0.13',
    date: '2026-10-22',
    important: false,
    items: [
      {
        icon: 'notifications-outline',
        title: 'Daha sadə canlı bildiriş',
        description:
          'Vaxt zolağının və cari mövqe göstəricisinin xarici kölgəsi silinib. Namaza qalan vaxt və kərahət intervalları saxlanılır.',
      },
    ],
  },
  {
    versionCode: 15,
    version: '1.0.12',
    date: '2026-10-22',
    important: false,
    items: [
      {
        icon: 'time-outline',
        title: 'Əsas ekranda daha yığcam geri sayım',
        description:
          '“Son 15 dəqiqə” və “Son 30 dəqiqə” yazıları çıxarılıb. Namaza qalan vaxt geri sayımda göstərilir.',
      },
    ],
  },
  {
    versionCode: 14,
    version: '1.0.11',
    date: '2026-10-22',
    important: true,
    items: [
      {
        icon: 'notifications-outline',
        title: 'Daha aydın canlı bildiriş',
        description: 'Parlaq vaxt zolağı, daha oxunaqlı namaz adı və geri sayım.',
      },
      {
        icon: 'time-outline',
        title: 'Kərahət intervalları bir baxışda',
        description: 'Kərahət vaxtları canlı bildirişdə qırmızı zolaqla göstərilir.',
      },
      {
        icon: 'checkmark-circle-outline',
        title: 'Kiçik ekranlarda daha rahat görünüş',
        description: 'Böyük şriftlərdə bildiriş mətnlərinin yerləşməsi yaxşılaşdırılıb.',
      },
    ],
  },
];

export function releaseNotesText(release: ReleaseNotes) {
  return release.items.map((item) => `${item.title}\n${item.description}`).join('\n\n') + '\n';
}

export function findRelease(versionCode: number, catalog = releases) {
  return catalog.find((release) => release.versionCode === versionCode);
}

export function releaseHistory(installedVersionCode: number, catalog = releases) {
  return catalog
    .filter((release) => release.versionCode <= installedVersionCode)
    .sort((a, b) => b.versionCode - a.versionCode);
}
