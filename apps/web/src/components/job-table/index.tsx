import { useSearchParams } from '@solidjs/router';
import { createSolidTable, flexRender, getCoreRowModel, Header } from '@tanstack/solid-table';
import {
  For,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js';
import { getJobs, JobsResponse } from '~/lib/queries';
import { columnOrder, defaultColumns, setColumnOrder } from './columns';
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
import { aggUtils, mergeAggregate } from '~/lib/utils/aggregate';
import { Table, TableCell, TableFooter, TableHeader, TableRow } from '../ui/table';

export function JobTable() {
  let tableContainerRef!: HTMLDivElement;
  let bottomElRef!: HTMLTableSectionElement;

  const [searchParams, setSearchParams] = useSearchParams<SearchParams>();
  const [nextCursor, setNextCursor] = createSignal<string | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);
  const [dropPosition, setDropPosition] = createSignal<{
    index: number;
    direction: 'left' | 'right';
  } | null>(null);

  const { draggable } = createDraggable();

  // @ts-expect-error fix ts issue
  const [fetchedJobs] = createResource<JobsResponse, Array<string | null | undefined>>(
    () => [
      searchParams.search,
      searchParams.startDate,
      searchParams.endDate,
      nextCursor(),
      searchParams.aggregated,
    ],
    async ([search, startDate, endDate, cursor, aggregated]) => {
      const validatedParams = searchParamsSchema.safeParse({
        search,
        startDate,
        endDate,
        aggregated,
      });

      if (!validatedParams.success) {
        console.error('Failed to parse params', { cause: validatedParams.error });
        return;
      }

      const data = validatedParams.data;
      return getJobs(data.search, data.startDate, data.endDate, cursor, data.aggregated);
    },
  );

  const jobs = createMemo<JobsResponse>((prev) => {
    if (fetchedJobs.state === 'errored') {
      return { data: [], totalCount: 0 };
    }

    if (fetchedJobs.state === 'ready') {
      if (nextCursor()) {
        if (searchParams.aggregated) {
          const computedData = mergeAggregate(
            prev.data,
            fetchedJobs().data,
            {
              ids: aggUtils.arrays.concat,
              isAggregated: () => true,
              count: aggUtils.numbers.sum,
              locations: aggUtils.arrays.uniqueConcat,
              links: aggUtils.arrays.uniqueConcat,
              remote: aggUtils.arrays.uniqueConcat,
            },
            (j) => `${j.title}|${j.company}`,
            {
              includeUnmatched: true,
            },
          );
          return { data: computedData, totalCount: prev.totalCount };
        }
        return {
          data: [...prev.data, ...fetchedJobs().data],
          totalCount: prev.totalCount,
        };
      }
      return fetchedJobs();
    }

    return prev;
  }, fetchedJobs());

  const table = createSolidTable({
    get data() {
      return jobs()?.data || [];
    },
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      columnOrder: columnOrder(),
    },
  });

  const isReady = () => fetchedJobs.state === 'ready';

  createEffect(() => {
    const lastJob = jobs()?.data?.at(-1);

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && isReady() && lastJob) {
        setNextCursor(lastJob.updatedAt);
      }
    });

    io.observe(bottomElRef);
    onCleanup(() => io.disconnect());
  });

  ignoreResizeObserverError();

  const updateSearchFilters = (params: Partial<SearchParams>) => {
    tableContainerRef.scrollTo({ top: 0 });
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

  const handleDrag = throttle(
    (header: Header<JobsResponse['data'][0], JobsResponse['data'][0]>, data: DragEventData) => {
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
    },
    150,
  );

  const handleDragEnd = (
    header: Header<JobsResponse['data'][0], JobsResponse['data'][0]>,
    data: DragEventData,
  ) => {
    setDropPosition(null);
    setIsDragging(false);
    const headers = table.getFlatHeaders();
    const finalPosition = header.getStart() + data.offsetX + header.getSize() / 2;
    const targetIndex = calculateTargetIndex(finalPosition);

    const newOrder = headers.map((h) => h.id).toSpliced(header.index, 1);
    newOrder.splice(targetIndex, 0, header.id);

    setColumnOrder(newOrder);
    table.setColumnOrder(newOrder);
  };

  return (
    <main class="mx-auto max-w-7xl p-4">
      <div class="rounded-lg bg-white p-6 shadow">
        <div>
          <Search updateSearchFilters={updateSearchFilters} />
          <Filters updateSearchFilters={updateSearchFilters} />

          <div class="mt-4 text-sm text-gray-500">
            Showing {table.getRowCount()} of {jobs()?.totalCount || 0}
          </div>
        </div>

        <Table
          container={{
            ref: (el) => {
              tableContainerRef = el;
            },
            class: 'max-h-[75dvh] overflow-auto rounded-lg border border-gray-200',
          }}
          class="w-full"
          style={{
            width: `${table.getTotalSize()}px`,
          }}
        >
          <TableHeader class="sticky top-0 z-10">
            <TableRow class="bg-gray-50 text-sm hover:bg-gray-50">
              <For each={table.getFlatHeaders()}>
                {(header) => (
                  // Fot now just copy paste the styles because a directive can't be passed to a component
                  // https://github.com/solidjs/solid/discussions/722
                  <th
                    use:draggable={{
                      axis: 'x',
                      bounds: 'parent',
                      onDragStart: () => setIsDragging(true),
                      onDrag: (data) => handleDrag(header, data),
                      onDragEnd: (data) => handleDragEnd(header, data),
                    }}
                    class="text-muted-foreground h-10 px-2 text-left align-middle font-medium active:bg-blue-500/50 [&:has([role=checkbox])]:pr-0"
                    classList={{
                      'before:content-[""] before:absolute before:left-0 before:top-0 before:w-[3px] before:h-full before:bg-blue-500 before:z-10':
                        dropPosition()?.index === header.index &&
                        dropPosition()?.direction === 'left',
                      'after:content-[""] after:absolute after:right-0 after:top-0 after:w-[3px] after:h-full after:bg-blue-500 after:z-10':
                        dropPosition()?.index === header.index &&
                        dropPosition()?.direction === 'right',
                    }}
                    style={{ width: `${header.getSize()}px` }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                )}
              </For>
            </TableRow>
          </TableHeader>

          <Virtualizer
            scrollRef={tableContainerRef}
            // startMargin={24} // table header height
            startMargin={40} // table header height
            data={table.getRowModel().rows}
            as="tbody"
            item={(props) => <TableRow class="hover:bg-gray-100" {...props} />}
          >
            {(row) => (
              <For each={row.getVisibleCells()}>
                {(cell) => (
                  <TableCell class="text-sm" style={{ width: `${cell.column.getSize()}px` }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                )}
              </For>
            )}
          </Virtualizer>

          <TableFooter ref={bottomElRef} class="w-full" />
        </Table>
      </div>
    </main>
  );
}
