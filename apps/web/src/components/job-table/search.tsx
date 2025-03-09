import { debounce } from '@solid-primitives/scheduled';
import { useSearchParams } from '@solidjs/router';
import { createSignal, onCleanup, onMount } from 'solid-js';
import { SearchParams } from './utils';

export function Search(props: { updateSearchFilters: (filters: Partial<SearchParams>) => void }) {
  const [searchParams] = useSearchParams<SearchParams>();
  const [search, setSearch] = createSignal(searchParams.search || '');
  let searchInputRef: HTMLInputElement | undefined;

  // eslint-disable-next-line solid/reactivity
  const debouncedSearch = debounce((search: string) => {
    props.updateSearchFilters({
      search: search.trim(),
    });
  }, 250);

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
    <div class="relative mb-4">
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
        class="w-full rounded-md border border-gray-200 px-4 py-2 text-sm placeholder-gray-400"
      />
      <div class="absolute right-3 top-1/2 -translate-y-1/2 transform text-sm text-gray-400">
        ⌘K
      </div>
    </div>
  );
}
