import { debounce } from '@solid-primitives/scheduled';
import { createAsync, query, useSearchParams } from '@solidjs/router';
import { ColumnDef, createSolidTable, flexRender, getCoreRowModel } from '@tanstack/solid-table';
import { and, between, db, desc, getAllJobsCount, type Job, jobs, like, lt, or } from 'database';
import { For, Show, createMemo, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { z } from 'zod';

const urlSchema = z.string().url();

const getJobs = query(
  async (search: string, startDate: string, endDate: string, cursor: string | null = null) => {
    'use server';
    search = `%${search.toLowerCase()}%`;

    const start = startDate || new Date(1970, 1).toISOString();
    const end =
      endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString();

    const query = db
      .select()
      .from(jobs)
      .where(
        and(
          cursor ? lt(jobs.updatedAt, cursor) : undefined,
          or(like(jobs.title, search), like(jobs.company, search)),
          between(jobs.updatedAt, start, end),
        ),
      );

    return await query.limit(25).orderBy(desc(jobs.updatedAt));
  },
  'jobs',
);

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

const searchParamsSchema = z.object({
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
});

type SearchParams = z.infer<typeof searchParamsSchema>;

const JobTable = () => {
  const [searchParams, setSearchParams] = useSearchParams<SearchParams>();
  const [search, setSearch] = createSignal(searchParams.search || '');
  const [nextCursor, setNextCursor] = createSignal<string | null>(null);

  const throttledSearch = debounce((search: string) => {
    setNextCursor(null);
    setSearchParams(
      {
        search: search.trim(),
      },
      { replace: true, scroll: true },
    );
  }, 250);

  const [tableData] = createResource(
    () => [searchParams.search, searchParams.startDate, searchParams.endDate, nextCursor()],
    async ([search, startDate, endDate, cursor]) => {
      const validatedParams = searchParamsSchema.parse({
        search,
        startDate,
        endDate,
      });

      return getJobs(
        validatedParams.search,
        validatedParams.startDate,
        validatedParams.endDate,
        cursor,
      );
    },
  );

  const jobsData = createMemo<Job[]>((prev) => {
    if (tableData.state === 'errored') {
      return [];
    }

    if (tableData.state === 'ready') {
      if (nextCursor()) {
        return [...prev, ...tableData()];
      }
      return tableData();
    }

    return prev;
  }, tableData() || []);

  const totalJobsCount = createAsync(() => totalJobs());

  const table = createSolidTable({
    get data() {
      return jobsData();
    },
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  let bottomElRef: HTMLDivElement | undefined;

  onMount(() => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && tableData.state === 'ready') {
        const lastJob = jobsData()?.at(-1);

        if (lastJob) {
          setNextCursor(lastJob.updatedAt);
        }
      }
    });

    io.observe(bottomElRef!);
    onCleanup(() => io.disconnect());
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
      <div class="bg-white rounded-lg shadow p-6 ">
        <div class="sticky top-4 bg-white">
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
            value={searchParams.startDate || ''}
            onInput={(e) => {
              setNextCursor(null);
              setSearchParams(
                {
                  startDate: e.target.value,
                },
                { replace: true, scroll: true },
              );
            }}
            class="px-4 py-2 border border-gray-200 rounded-md text-sm"
          />
          <input
            type="date"
            value={searchParams.endDate || ''}
            onInput={(e) => {
              setNextCursor(null);
              setSearchParams(
                {
                  endDate: e.target.value,
                },
                { replace: true, scroll: true },
              );
            }}
            class="px-4 py-2 border border-gray-200 rounded-md text-sm"
          />

          <Show when={searchParams.startDate || searchParams.endDate}>
            <button
              type="button"
              onClick={() => {
                setNextCursor(null);
                setSearchParams({ startDate: '', endDate: '' }, { replace: true, scroll: true });
              }}
            >
              Clear dates
            </button>
          </Show>

          <div class="mt-4 text-sm text-gray-500">
            Showing {table.getRowCount()} of total {totalJobsCount()?.[0].count || 0}
          </div>
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200">
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

          <div ref={bottomElRef} />
        </div>
      </div>
    </main>
  );
};

export default JobTable;
