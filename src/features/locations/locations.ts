import locations from '../../../data/locations.json';
export const allLocations = [...locations].sort((a, b) => a.name.localeCompare(b.name, 'az'));
export const locationName = (id: string) =>
  allLocations.find((l) => l.id === id)?.name ?? 'Şəhər seçin';
export function searchLocations(query: string) {
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase('az')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ı/g, 'i')
      .replace(/ə/g, 'e');
  return allLocations.filter((city) => normalize(city.name).includes(normalize(query.trim())));
}
