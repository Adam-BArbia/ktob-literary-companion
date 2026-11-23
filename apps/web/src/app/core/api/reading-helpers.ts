import { ReadingExperience } from './ktob-api.service';

export const readingStatusLabel = (status: string): string =>
  ({
    WANT_TO_READ: 'Want to read',
    CURRENTLY_READING: 'Currently reading',
    PAUSED: 'Paused',
    FINISHED: 'Finished',
    DID_NOT_FINISH: 'Did not finish',
  })[status] ?? 'On your shelf';

export const isOpenReading = (reading: ReadingExperience): boolean =>
  reading.status === 'CURRENTLY_READING' || reading.status === 'PAUSED';

/** Dates are calendar dates; format at noon to avoid moving them across time zones. */
export function readingDate(value?: string | null): string {
  if (!value) return 'Date not recorded';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value + 'T12:00:00'));
}

export function todayDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/** Bound concurrent requests so a large library does not flood the free API instance. */
export async function mapInBatches<T, R>(
  items: T[],
  map: (item: T) => Promise<R>,
  size = 4,
): Promise<R[]> {
  const result: R[] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    result.push(...(await Promise.all(items.slice(offset, offset + size).map(map))));
  }
  return result;
}
