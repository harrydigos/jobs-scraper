import type { CellContext, ColumnDef } from '@tanstack/solid-table';
import { createSignal, For, JSX, Show } from 'solid-js';
import { z } from 'zod';
import { makePersisted } from '@solid-primitives/storage';
import { JobsResponse } from '~/lib/queries';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';

const urlSchema = z.string().url();

function truncate(value: string | undefined, maxLength: number) {
  return value && value.length > maxLength ? `${value.slice(0, maxLength)}...` : value || '';
}

function WithTooltip(props: {
  info: CellContext<JobsResponse['data'][0], unknown>;
  renderWhenAgg: JSX.Element;
  renderTooltipContent: JSX.Element;
  fallback?: JSX.Element;
  showCount?: boolean;
  shouldShowContent?: boolean;
}) {
  return (
    <Show
      when={props.info.row.original.isAggregated}
      fallback={props.fallback || props.info.getValue<string>()}
    >
      <Tooltip openDelay={300} gutter={0}>
        <div class="inline-flex items-center gap-1">
          <span>{props.renderWhenAgg}</span>
          <Show when={props.info.row.original.count > 1 && props.shouldShowContent}>
            <TooltipTrigger>
              <span class="w-fit rounded-sm bg-stone-900 px-0.5 text-xs text-stone-100">
                <Show when={props.showCount} fallback="+">
                  {props.info.row.original.count}
                </Show>
              </span>
            </TooltipTrigger>
          </Show>
        </div>
        <Show when={props.shouldShowContent}>
          <TooltipContent
            class="flex max-h-40 flex-col gap-1 overflow-auto truncate text-xs"
            style={{
              'max-width': `${Math.max(props.info.column.getSize(), 250)}px`,
            }}
          >
            {props.renderTooltipContent}
          </TooltipContent>
        </Show>
      </Tooltip>
    </Show>
  );
}

export const defaultColumns = [
  {
    id: 'id',
    accessorKey: 'id',
    header: () => 'ID',
    cell: (info) => {
      return (
        <WithTooltip
          info={info}
          renderWhenAgg={'aggregated'}
          renderTooltipContent={<For each={info.row.original.ids}>{(id) => <span>{id}</span>}</For>}
          showCount
          shouldShowContent
        />
      );
    },
    size: 140,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: () => 'Created At',
    size: 200,
  },
  {
    id: 'updatedAt',
    accessorKey: 'updatedAt',
    header: () => 'Updated At',
    size: 200,
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
    cell: (info) => {
      return (
        <WithTooltip
          info={info}
          renderWhenAgg={truncate(info.getValue<string[]>()?.at(0), 30)}
          renderTooltipContent={
            <For each={info.getValue<string[]>().slice(1)}>{(l) => <span>{l}</span>}</For>
          }
          shouldShowContent={info.getValue<string[]>().length > 1}
        />
      );
    },
    size: 80,
  },
  {
    id: 'locations',
    accessorKey: 'locations',
    header: () => 'Location',
    size: 250,
    cell: (info) => {
      return (
        <WithTooltip
          info={info}
          renderWhenAgg={truncate(info.getValue<string[]>()?.at(0), 30)}
          fallback={truncate(info.getValue<string[]>()?.at(0), 30)}
          renderTooltipContent={
            <For each={info.getValue<string[]>().slice(1)}>{(l) => <span>{l}</span>}</For>
          }
          shouldShowContent={info.getValue<string[]>().length > 1}
        />
      );
    },
  },
  {
    id: 'timeSincePosted',
    accessorKey: 'timeSincePosted',
    header: () => 'Time Since Posted',
    size: 180,
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
      const renderLink = (link?: string, showLink = false) => {
        const validationResult = urlSchema.safeParse(link);
        return (
          <Show when={validationResult.success} fallback="-">
            <a href={validationResult.data} target="_blank" rel="noopener noreferrer">
              {showLink ? validationResult.data : 'Link'}
            </a>
          </Show>
        );
      };
      const value = info.getValue<string[]>().at(0);

      return (
        <WithTooltip
          info={info}
          fallback={renderLink(value)}
          renderWhenAgg={renderLink(value)}
          renderTooltipContent={
            <For each={info.getValue<string[]>()}>{(l) => <span>{renderLink(l, true)}</span>}</For>
          }
          shouldShowContent
        />
      );
    },
    size: 60,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] satisfies ColumnDef<JobsResponse['data'][0], any>[];

export const [columnOrder, setColumnOrder] = makePersisted(
  // eslint-disable-next-line solid/reactivity
  createSignal(defaultColumns.map((c) => c.id)),
  {
    name: 'job-table-column-order',
    storage: localStorage,
  },
);
