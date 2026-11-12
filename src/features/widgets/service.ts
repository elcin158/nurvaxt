import { Platform } from 'react-native';
import Alarm from '../../../modules/nurvaxt-alarm/src';
import { bundledDatasets, PRAYER_DB_BUNDLE } from '../../database/bundled';
import { readDays } from '../../database/repository';
import { usePreferences } from '../../store/preferences';
import { locationName } from '../locations/locations';
import { createWidgetPlan, type WidgetVariant } from './domain';

let queue = Promise.resolve();
async function synchronize() {
  if (Platform.OS !== 'android' || !Alarm?.replaceWidgetPlan) return;
  const { locationId } = usePreferences.getState();
  const ranges = bundledDatasets.map((dataset) => dataset.dateRange);
  const start = ranges.map((range) => range.start).sort()[0];
  const end = ranges
    .map((range) => range.end)
    .sort()
    .at(-1);
  const days = start && end ? await readDays(locationId, start, end) : [];
  const prefs = usePreferences.getState();
  // The queued follow-up applies the new city; never overwrite it with an old IO result.
  if (prefs.locationId !== locationId) return;
  await Alarm.replaceWidgetPlan(
    JSON.stringify(
      createWidgetPlan(days, {
        bundle: PRAYER_DB_BUNDLE,
        locationId,
        location: locationName(locationId),
        timeFormat: prefs.timeFormat,
      }),
    ),
  );
}

/** Separate queue and error handling: notification permission never gates a widget. */
export function synchronizeWidgets(): Promise<void> {
  queue = queue.then(synchronize, synchronize);
  return queue;
}

export async function pinWidget(variant: WidgetVariant): Promise<boolean> {
  if (Platform.OS !== 'android' || !Alarm?.requestPinWidget) return false;
  await synchronizeWidgets();
  return Alarm.requestPinWidget(variant);
}
