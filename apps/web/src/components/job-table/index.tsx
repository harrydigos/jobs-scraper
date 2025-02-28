import { createAsync, useSearchParams } from '@solidjs/router';
import { createSolidTable, flexRender, getCoreRowModel, Header } from '@tanstack/solid-table';
import type { Job } from 'database';
import {
  For,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js';
import { getJobs, getTotalJobs } from '~/lib/queries';
import { defaultColumns } from './columns';
import { Virtualizer } from 'virtua/solid';
import { createDraggable, DragEventData } from '@neodrag/solid';
import { Filters } from './filters';
import {
  ignoreResizeObserverError,
  isOrderChanged,
  SearchParams,
  searchParamsSchema,
} from './utils';
import { Search } from './search';
import { throttle } from '@solid-primitives/scheduled';

export function JobTable() {
  let tableContainerRef: HTMLDivElement | undefined;
  let bottomElRef: HTMLTableSectionElement | undefined;

  const [searchParams, setSearchParams] = useSearchParams<SearchParams>();
  const [nextCursor, setNextCursor] = createSignal<string | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);
  const [dropPosition, setDropPosition] = createSignal<{
    index: number;
    direction: 'left' | 'right';
  } | null>(null);

  const { draggable } = createDraggable();

  const totalJobsCount = createAsync(() => getTotalJobs());

  const [tableData] = createResource<Array<Job>, Array<string | null | undefined>>(
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

  const table = createSolidTable({
    get data() {
      return jobsData();
    },
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

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

  ignoreResizeObserverError();

  const updateSearchFilters = (params: Partial<SearchParams>) => {
    tableContainerRef?.scrollTo({ top: 0 });
    setNextCursor(null);
    setSearchParams(params, { replace: true, scroll: true });
  };

  const calculateTargetIndex = (finalPosition: number) => {
    const { targetIndex } = table.getFlatHeaders().reduce(
      (acc, h, index) => {
        const distance = Math.abs(h.getStart() + h.getSize() / 2 - finalPosition);
        if (distance < acc.minDistance) {
          return { minDistance: distance, targetIndex: index };
        }
        return acc;
      },
      { minDistance: Infinity, targetIndex: 0 },
    );

    return targetIndex;
  };

  const handleDrag = throttle((header: Header<Job, Job>, data: DragEventData) => {
    if (untrack(() => !isDragging())) {
      return;
    }

    const finalPosition = header.getStart() + data.offsetX + header.getSize() / 2;
    const headers = table.getFlatHeaders();
    const targetIndex = calculateTargetIndex(finalPosition);

    const newOrder = headers.map((h) => h.id).toSpliced(header.index, 1);
    newOrder.splice(targetIndex, 0, header.id);

    if (!isOrderChanged(headers, newOrder)) {
      setDropPosition(null);
      return;
    }

    setDropPosition({
      index: targetIndex,
      direction: header.getStart() > headers[targetIndex].getStart() ? 'left' : 'right',
    });
  }, 150);

  const handleDragEnd = (header: Header<Job, Job>, data: DragEventData) => {
    setDropPosition(null);
    setIsDragging(false);
    const headers = table.getFlatHeaders();
    const finalPosition = header.getStart() + data.offsetX + header.getSize() / 2;
    const targetIndex = calculateTargetIndex(finalPosition);

    const newOrder = headers.map((h) => h.id).toSpliced(header.index, 1);
    newOrder.splice(targetIndex, 0, header.id);
    table.setColumnOrder(newOrder);
  };

  return (
    <main class="p-4 max-w-7xl mx-auto">
      <div class="bg-white rounded-lg shadow p-6">
        <div>
          <Search updateSearchFilters={updateSearchFilters} />
          <Filters updateSearchFilters={updateSearchFilters} />

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
                    <th
                      use:draggable={{
                        axis: 'x',
                        bounds: 'parent',
                        onDragStart: () => setIsDragging(true),
                        onDrag: (data) => handleDrag(header, data),
                        onDragEnd: (data) => handleDragEnd(header, data),
                      }}
                      class="active:bg-blue-500/50"
                      classList={{
                        'before:content-[""] before:absolute before:left-0 before:w-[3px] before:h-full before:bg-blue-500 before:z-20':
                          dropPosition()?.index === header.index &&
                          dropPosition()?.direction === 'left',
                        'after:content-[""] after:absolute after:right-0 after:w-[3px] after:h-full after:bg-blue-500 after:z-20':
                          dropPosition()?.index === header.index &&
                          dropPosition()?.direction === 'right',
                      }}
                      style={{ width: `${header.getSize()}px` }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
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
}
