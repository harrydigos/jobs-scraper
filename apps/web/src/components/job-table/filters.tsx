import { useSearchParams } from '@solidjs/router';
import { Show } from 'solid-js';
import { SearchParams } from './utils';

export function Filters(props: { updateSearchFilters: (filters: Partial<SearchParams>) => void }) {
  const [searchParams] = useSearchParams<SearchParams>();

  return (
    <div class="bg-white">
      <input
        type="date"
        value={searchParams.startDate || ''}
        onInput={(e) => {
          props.updateSearchFilters({
            startDate: e.target.value,
          });
        }}
        class="px-4 py-2 border border-gray-200 rounded-md text-sm"
      />
      <input
        type="date"
        value={searchParams.endDate || ''}
        onInput={(e) => {
          props.updateSearchFilters({
            endDate: e.target.value,
          });
        }}
        class="px-4 py-2 border border-gray-200 rounded-md text-sm"
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
  );
}
