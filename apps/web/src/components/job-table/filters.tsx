import { useSearchParams } from '@solidjs/router';
import { Show } from 'solid-js';
import { SearchParams } from './utils';

export function Filters(props: { updateSearchFilters: (filters: Partial<SearchParams>) => void }) {
  const [searchParams] = useSearchParams<SearchParams>();

  return (
    <div class="flex w-full items-center justify-between gap-4 bg-white">
      <div class="flex items-center gap-4">
        <input
          type="date"
          value={searchParams.startDate || ''}
          onInput={(e) => {
            props.updateSearchFilters({
              startDate: e.target.value,
            });
          }}
          class="rounded-md border border-gray-200 px-4 py-2 text-sm"
        />
        <input
          type="date"
          value={searchParams.endDate || ''}
          onInput={(e) => {
            props.updateSearchFilters({
              endDate: e.target.value,
            });
          }}
          class="rounded-md border border-gray-200 px-4 py-2 text-sm"
        />

        <Show when={searchParams.startDate || searchParams.endDate}>
          <button
            type="button"
            onClick={() => {
              props.updateSearchFilters({
                startDate: '',
                endDate: '',
              });
            }}
          >
            Clear dates
          </button>
        </Show>
      </div>

      <div>
        <label class="flex cursor-pointer gap-1">
          <input
            type="checkbox"
            class="cursor-pointer"
            checked={searchParams.aggregated === 'true'}
            onChange={(e) =>
              props.updateSearchFilters({
                aggregated: e.target.checked ? 'true' : undefined,
              })
            }
          />
          <span>Aggregate data</span>
        </label>
      </div>
    </div>
  );
}
