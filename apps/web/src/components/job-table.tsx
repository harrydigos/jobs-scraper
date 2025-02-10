import { leadingAndTrailing, throttle } from '@solid-primitives/scheduled';
import { createAsync, query, RouteDefinition, useSearchParams } from '@solidjs/router';
import { ColumnDef, createSolidTable, flexRender, getCoreRowModel } from '@tanstack/solid-table';
import { db, desc, getAllJobsCount, Job, jobs, like, or } from 'database';
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';

const getJobs = query(async (search = '') => {
  'use server';
  search = `%${search.toLowerCase()}%`;
  return await db
    .select()
    .from(jobs)
    .where(or(like(jobs.title, search), or(like(jobs.company, search))))
    .orderBy(desc(jobs.createdAt));
}, 'jobs');

const totalJobs = query(async () => {
  'use server';
  return await getAllJobsCount();
}, 'jobs-count');

export const route = {
  preload: () => getJobs(),
} satisfies RouteDefinition;

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
      const value = info.getValue<string>();
      return (
        <Show when={value?.startsWith('https://')} fallback="-">
          <a href={value} target="_blank">
            Link
          </a>
        </Show>
      );
    },
  },
];

const JobTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const throttledSearch = leadingAndTrailing(
    throttle,
    (search: string) => setSearchParams({ search: search.trim() }, { replace: true }),
    500,
  );
  const [search, setSearch] = createSignal(searchParams.search || '');

  const tableData = createAsync(async () => {
    return (
      (await getJobs(Array.isArray(searchParams?.search) ? '' : searchParams.search || '')) || []
    );
  });

  const jobCount = createAsync(() => totalJobs());

  const table = createSolidTable({
    get data() {
      return tableData() || [];
    },
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
    rowCount: jobCount()?.[0].count || 0,
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

        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <div class="mt-4 text-sm text-gray-500">Total jobs: {table.getRowCount()}</div>
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
