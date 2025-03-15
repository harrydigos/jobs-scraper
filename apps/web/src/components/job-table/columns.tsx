import type { ColumnDef } from '@tanstack/solid-table';
import { createSignal, For, Show } from 'solid-js';
import { z } from 'zod';
import { makePersisted } from '@solid-primitives/storage';
import { JobsResponse } from '~/lib/queries';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';

const urlSchema = z.string().url();

function truncate(value: string | undefined, maxLength: number) {
  return value && value.length > maxLength ? `${value.slice(0, maxLength)}...` : value || '';
}

export const defaultColumns = [
  {
    id: 'id',
    accessorKey: 'id',
    header: () => 'ID',
    cell: (info) => {
      const isAggregated = info.row.original.isAggregated;
      const count = info.row.original.count;
      return (
        <Show when={isAggregated} fallback={info.getValue<string>()}>
          <Tooltip gutter={0}>
            <TooltipTrigger class="inline-flex items-center gap-1">
              <span>aggregated</span>
              <span class="w-fit rounded-sm bg-stone-900 px-0.5 text-xs text-stone-100">
                {count}
              </span>
            </TooltipTrigger>
            <TooltipContent class="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs" as="ul">
              <For each={info.row.original.ids}>{(id) => <li>{id}</li>}</For>
            </TooltipContent>
          </Tooltip>
        </Show>
      );
    },
    size: 140,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: () => 'Created At',
    size: 250,
  },
  {
    id: 'updatedAt',
    accessorKey: 'updatedAt',
    header: () => 'Updated At',
    size: 250,
  },
  {
    id: 'title',
    accessorKey: 'title',
    header: () => 'Job Title',
    size: 360,
    cell: (info) => truncate(info.getValue<string>(), 50).toLowerCase(),
  },
  {
    id: 'company',
    accessorKey: 'company',
    header: () => 'Company',
    size: 250,
    cell: (info) => truncate(info.getValue<string>(), 30),
  },
  {
    id: 'remote',
    accessorKey: 'remote',
    header: () => 'Remote',
    cell: (info) => truncate(info.getValue<string[]>()?.at(0), 30),
    size: 80,
  },
  {
    id: 'locations',
    accessorKey: 'locations',
    header: () => 'Location',
    size: 250,
    cell: (info) => truncate(info.getValue<string[]>()?.at(0), 30),
  },
  {
    id: 'timeSincePosted',
    accessorKey: 'timeSincePosted',
    header: () => 'Time Since Posted',
    size: 160,
  },
  {
    id: 'companySize',
    accessorKey: 'companySize',
    header: () => 'Company Size',
    size: 120,
  },
  {
    id: 'links',
    accessorKey: 'links',
    header: () => 'Link',
    cell: (info) => {
      const validationResult = urlSchema.safeParse(info.getValue<string[]>()?.at(0));
      return (
        <Show when={validationResult.success} fallback="-">
          <a href={validationResult.data} target="_blank" rel="noopener noreferrer">
            Link
          </a>
        </Show>
      );
    },
    size: 60,
  },
] satisfies ColumnDef<JobsResponse[0]>[];

export const [columnOrder, setColumnOrder] = makePersisted(
  // eslint-disable-next-line solid/reactivity
  createSignal(defaultColumns.map((c) => c.id)),
  {
    name: 'job-table-column-order',
    storage: localStorage,
  },
);
