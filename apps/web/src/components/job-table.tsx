import { debounce } from '@solid-primitives/scheduled';
import { createAsync, useSearchParams } from '@solidjs/router';
import { createSolidTable, flexRender, getCoreRowModel } from '@tanstack/solid-table';
import type { Job } from 'database';
import { For, Show, createMemo, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { z } from 'zod';
import { getJobs, getTotalJobs } from '~/lib/queries';
import { defaultColumns } from './columns';
import { Virtualizer } from 'virtua/solid';
import { isServer } from 'solid-js/web';
import { createDraggable } from '@neodrag/solid';

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

  let tableContainerRef: HTMLDivElement | undefined;

  const updateSearchFilters = (params: Partial<SearchParams>) => {
    tableContainerRef?.scrollTo({ top: 0 });
    setNextCursor(null);
    setSearchParams(params, { replace: true, scroll: true });
  };

  const debouncedSearch = debounce((search: string) => {
    updateSearchFilters({
      search: search.trim(),
    });
  }, 250);

  const { draggable } = createDraggable();

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

  const totalJobsCount = createAsync(() => getTotalJobs());

  const table = createSolidTable({
    get data() {
      return jobsData();
    },
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  let bottomElRef: HTMLTableSectionElement | undefined;

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

  if (!isServer) {
    window.addEventListener('error', (event) => {
      if (event.message === 'ResizeObserver loop completed with undelivered notifications.') {
        event.stopImmediatePropagation();
      }
    });
  }

  const [dropPosition, setDropPosition] = createSignal<{
    index: number;
    direction: 'left' | 'right';
  } | null>(null);

  return (
    <main class="p-4 max-w-7xl mx-auto">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="bg-white">
          <div class="mb-4 relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by title, company"
              value={search()}
              onInput={(e) => {
                const value = e.target.value;
                setSearch(value);
                debouncedSearch(value);
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
              updateSearchFilters({
                startDate: e.target.value,
              });
            }}
            class="px-4 py-2 border border-gray-200 rounded-md text-sm"
          />
          <input
            type="date"
            value={searchParams.endDate || ''}
            onInput={(e) => {
              updateSearchFilters({
                endDate: e.target.value,
              });
            }}
            class="px-4 py-2 border border-gray-200 rounded-md text-sm"
          />

          <Show when={searchParams.startDate || searchParams.endDate}>
            <button
              type="button"
              onClick={() => {
                updateSearchFilters({
                  startDate: '',
                  endDate: '',
                });
              }}
            >
              Clear dates
            </button>
          </Show>

          <div class="mt-4 text-sm text-gray-500">
            Showing {table.getRowCount()} of total {totalJobsCount()?.[0].count || 0}
          </div>
        </div>

        <div
          ref={tableContainerRef}
          class="overflow-auto max-h-[75dvh] rounded-lg border border-gray-200"
        >
          <table
            class="w-full"
            style={{
              width: `${table.getTotalSize()}px`,
            }}
          >
            <thead class="sticky top-0 z-10">
              <tr class="bg-gray-50 text-sm">
                <For each={table.getFlatHeaders()}>
                  {(header) => (
                    <>
                      <Show
                        when={
                          dropPosition()?.index === header.index &&
                          dropPosition()?.direction === 'left'
                        }
                      >
                        <th class="w-[3px] h-full bg-blue-500 z-20" />
                      </Show>

                      <th
                        use:draggable={{
                          axis: 'x',
                          bounds: 'parent',
                          onDrag: (data) => {
                            const finalPosition =
                              header.getStart() + data.offsetX + header.getSize() / 2;

                            const headers = table.getFlatHeaders();

                            let targetIndex = 0;
                            let minDistance = Infinity;

                            headers.forEach((h, index) => {
                              const columnCenter = h.getStart() + h.getSize() / 2;
                              const distance = Math.abs(columnCenter - finalPosition);

                              if (distance < minDistance) {
                                minDistance = distance;
                                targetIndex = index;
                              }
                            });

                            // if (targetIndex !== header.index) {
                            const newOrder = [...headers.map((h) => h.id)];

                            newOrder.splice(header.index, 1);
                            newOrder.splice(targetIndex, 0, header.id);

                            function isOrderChanged(
                              headers: Array<{ id: string }>,
                              newOrder: Array<string>,
                            ): boolean {
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

                            if (!isOrderChanged(headers, newOrder)) {
                              setDropPosition(null);
                              return;
                            }

                            setDropPosition({
                              // x: headers[targetIndex].getStart(),
                              index: targetIndex,
                              direction:
                                header.getStart() > headers[targetIndex].getStart()
                                  ? 'left'
                                  : 'right',
                            });
                          },
                          onDragEnd: (data) => {
                            setDropPosition(null);

                            const headers = table.getFlatHeaders();
                            const currentOrder = headers.map((h) => h.id);

                            const draggedOriginalPosition = header.getStart();
                            const finalPosition =
                              draggedOriginalPosition + data.offsetX + header.getSize() / 2;

                            // Find which column position this is closest to
                            let targetIndex = 0;
                            let minDistance = Infinity;

                            headers.forEach((h, index) => {
                              // Calculate center point of each column
                              const columnCenter = h.getStart() + h.getSize() / 2;
                              const distance = Math.abs(columnCenter - finalPosition);

                              if (distance < minDistance) {
                                minDistance = distance;
                                targetIndex = index;
                              }
                            });

                            const newOrder = [...currentOrder];

                            newOrder.splice(header.index, 1);
                            newOrder.splice(targetIndex, 0, header.id);

                            console.log({ newOrder });

                            table.setColumnOrder(newOrder);
                          },
                        }}
                        // colSpan={header.colSpan}
                        class="active:bg-blue-500/50"
                        style={{ width: `${header.getSize()}px` }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>

                      <Show
                        when={
                          dropPosition()?.index === header.index &&
                          dropPosition()?.direction === 'right'
                        }
                      >
                        <th class="w-[3px] h-full bg-blue-500 z-20" />
                      </Show>
                    </>
                  )}
                </For>
              </tr>
            </thead>

            <Virtualizer
              scrollRef={tableContainerRef}
              startMargin={24} // table header height
              data={table.getRowModel().rows}
              as="tbody"
              item={(props) => <tr class="hover:bg-gray-100" {...props} />}
              // itemSize={80}
            >
              {(row) => (
                <For each={row.getVisibleCells()}>
                  {(cell) => (
                    <td class="text-sm" style={{ width: `${cell.column.getSize()}px` }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )}
                </For>
              )}
            </Virtualizer>

            <tfoot ref={bottomElRef} class="w-full" />
          </table>
        </div>
      </div>
    </main>
  );
};

export default JobTable;
