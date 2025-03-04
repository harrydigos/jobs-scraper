import type { ColumnDef } from '@tanstack/solid-table';
import type { Job } from '@jobs-scraper/database';
import { Show } from 'solid-js';
import { z } from 'zod';

const urlSchema = z.string().url();

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export const defaultColumns = [
  {
    id: 'id',
    accessorKey: 'id',
    header: () => 'ID',
    size: 120,
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
    size: 80,
  },
  {
    id: 'location',
    accessorKey: 'location',
    header: () => 'Location',
    size: 250,
    cell: (info) => truncate(info.getValue<string>(), 30),
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
    id: 'link',
    accessorKey: 'link',
    header: () => 'Link',
    cell: (info) => {
      const validationResult = urlSchema.safeParse(info.getValue());
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
] satisfies ColumnDef<Job>[];
