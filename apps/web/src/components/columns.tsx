import type { ColumnDef } from '@tanstack/solid-table';
import type { Job } from 'database';
import { Show } from 'solid-js';
import { z } from 'zod';

const urlSchema = z.string().url();

export const defaultColumns = [
  {
    accessorKey: 'id',
    header: () => 'ID',
    size: 120,
  },
  {
    accessorKey: 'createdAt',
    header: () => 'Created At',
    size: 250,
  },
  {
    accessorKey: 'updatedAt',
    header: () => 'Updated At',
    size: 250,
  },
  {
    accessorKey: 'title',
    header: () => 'Job Title',
    size: 500,
    cell: (info) => {
      const value = info.getValue() as string;
      return value.length > 50 ? value.slice(0, 50) : value;
    },
  },
  {
    accessorKey: 'company',
    header: () => 'Company',
    size: 250,
    cell: (info) => {
      const value = info.getValue() as string;
      return value.length > 40 ? value.slice(0, 40) : value;
    },
  },
  {
    accessorKey: 'remote',
    header: () => 'Remote',
    size: 120,
  },
  {
    accessorKey: 'location',
    header: () => 'Location',
    size: 300,
    cell: (info) => {
      const value = info.getValue() as string;
      return value.length > 30 ? value.slice(0, 30) : value;
    },
  },
  {
    accessorKey: 'timeSincePosted',
    header: () => 'Time Since Posted',
    size: 400,
  },
  {
    accessorKey: 'companySize',
    header: () => 'Company Size',
    size: 120,
  },
  {
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
    size: 120,
  },
] satisfies ColumnDef<Job>[];
