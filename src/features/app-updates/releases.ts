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
