import { Header } from '@tanstack/solid-table';
import { isServer } from 'solid-js/web';
import { z } from 'zod';
import { JobsResponse } from '~/lib/queries';

export const searchParamsSchema = z.object({
  search: z
    .string()
    .optional()
    .transform((val) => (Array.isArray(val) ? '' : val || '')),
  startDate: z
    .string()
    .optional()
    .transform((val) => (Array.isArray(val) || !val ? '' : new Date(val).toISOString())),
  endDate: z
    .string()
    .optional()
    .transform((val) => (Array.isArray(val) || !val ? '' : new Date(val).toISOString())),
  aggregated: z
    .string()
    .optional()
    .transform((val) => (val !== 'true' ? 'false' : 'true')),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export function ignoreResizeObserverError() {
  if (!isServer) {
    window.addEventListener('error', (event) => {
      console.warn(event);
      if (event.message === 'ResizeObserver loop completed with undelivered notifications.') {
        event.stopImmediatePropagation();
      }
    });
  }
}

export function isOrderChanged(
  headers: Array<Header<JobsResponse[0], JobsResponse[0]>>,
  newOrder: Array<string>,
) {
  if (headers.length !== newOrder.length) {
    return true;
  }

  for (let i = 0; i < headers.length; i++) {
    if (headers[i].id !== newOrder[i]) {
      return true;
    }
  }

  return false;
}
