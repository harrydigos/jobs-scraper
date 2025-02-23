import type { ColumnDef } from '@tanstack/solid-table';
import type { Job } from 'database';
import { Show } from 'solid-js';
import { z } from 'zod';

const urlSchema = z.string().url();

export const defaultColumns: ColumnDef<Job>[] = [
  {
    accessorKey: 'id',
    header: () => 'ID',
  },
  {
    accessorKey: 'createdAt',
    header: () => 'Created At',
  },
  {
    accessorKey: 'updatedAt',
    header: () => 'Updated At',
  },
  {
    accessorKey: 'title',
    header: () => 'Job Title',
  },
  {
    accessorKey: 'company',
    header: () => 'Company',
  },
  {
    accessorKey: 'remote',
    header: () => 'Remote',
  },
  {
    accessorKey: 'location',
    header: () => 'Location',
  },
  {
    accessorKey: 'timeSincePosted',
    header: () => 'Time Since Posted',
  },
  {
    accessorKey: 'companySize',
    header: () => 'Company Size',
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
  },
];
