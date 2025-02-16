import { leadingAndTrailing, throttle } from '@solid-primitives/scheduled';
import { createAsync, query, useSearchParams } from '@solidjs/router';
import { ColumnDef, createSolidTable, flexRender, getCoreRowModel } from '@tanstack/solid-table';
import { and, between, db, desc, getAllJobsCount, Job, jobs, like, or } from 'database';
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { z } from 'zod';

const urlSchema = z.string().url();

const getJobs = query(async (search = '', startDate = '', endDate = '') => {
  'use server';
  search = `%${search.toLowerCase()}%`;
  const query = db
    .select()
    .from(jobs)
    .where(
      and(
        or(like(jobs.title, search), like(jobs.company, search)),
        startDate || endDate
          ? between(
              jobs.updatedAt,
              startDate || new Date(1970, 1).toISOString(),
              endDate ||
                new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString(), // 100 years ok lol
            )
          : undefined,
      ),
    );

  return await query.orderBy(desc(jobs.createdAt));
}, 'jobs');

const totalJobs = query(async () => {
  'use server';
  return await getAllJobsCount();
}, 'jobs-count');

const defaultColumns: ColumnDef<Job>[] = [
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

const JobTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // TODO: validate url
  const throttledSearch = leadingAndTrailing(
    throttle,
    (search: string) =>
      setSearchParams({
        search: search.trim(),
        startDate: (searchParams.startDate as string) || '',
        endDate: (searchParams.endDate as string) || '',
      }),
    1000,
  );

  const [search, setSearch] = createSignal((searchParams.search as string) || '');

  const tableData = createAsync(async () => {
    return (
      (await getJobs(
        Array.isArray(searchParams?.search) ? '' : searchParams.search || '',
        Array.isArray(searchParams?.startDate) || !searchParams?.startDate
          ? ''
          : new Date(searchParams.startDate).toISOString(),
        Array.isArray(searchParams?.endDate) || !searchParams?.endDate
          ? ''
          : new Date(searchParams.endDate).toISOString(),
      )) || []
    );
  });

  const totalJobsCount = createAsync(() => totalJobs());

  const table = createSolidTable({
    get data() {
      return tableData() || [];
    },
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  let searchInputRef: HTMLInputElement | undefined;

  onMount(() => {
    const controller = new AbortController();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, {
      signal: controller.signal,
    });

    onCleanup(() => controller.abort());
  });

  return (
    <main class="p-4 max-w-7xl mx-auto">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="mb-4 relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by title, company"
            value={search()}
            onInput={(e) => {
              const value = e.target.value;
              setSearch(value);
              throttledSearch(value);
            }}
            class="w-full px-4 py-2 border border-gray-200 rounded-md text-sm placeholder-gray-400"
          />
          <div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            ⌘K
          </div>
        </div>
        <input
          type="date"
          value={(searchParams.startDate as string) || ''}
          onInput={(e) =>
            setSearchParams({
              search: search(),
              startDate: e.target.value,
              endDate: (searchParams.endDate as string) || '',
            })
          }
          class="px-4 py-2 border border-gray-200 rounded-md text-sm"
        />
        <input
          type="date"
          value={(searchParams.endDate as string) || ''}
          onInput={(e) =>
            setSearchParams({
              search: search(),
              startDate: (searchParams.startDate as string) || '',
              endDate: e.target.value,
            })
          }
          class="px-4 py-2 border border-gray-200 rounded-md text-sm"
        />

        <button
          type="button"
          onClick={() => setSearchParams({ search: search(), startDate: '', endDate: '' })}
        >
          Clear
        </button>

        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <div class="mt-4 text-sm text-gray-500">
            Showing {table.getRowCount()} of total {totalJobsCount()?.[0].count || 0}
          </div>
          <table class="w-full">
            <thead>
              <tr class="bg-gray-50">
                <For each={table.getFlatHeaders()}>
                  {(header) => (
                    <th>{flexRender(header.column.columnDef.header, header.getContext())}</th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={table.getRowModel().rows}>
                {(row) => (
                  <tr class="hover:bg-gray-50">
                    <For each={row.getVisibleCells()}>
                      {(cell) => (
                        <td>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default JobTable;
