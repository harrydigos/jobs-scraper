import { leadingAndTrailing, throttle } from '@solid-primitives/scheduled';
import { createAsync, query, RouteDefinition, useSearchParams } from '@solidjs/router';
import { db, Job, jobs, like, or } from 'database';
import { For, Show, createSignal } from 'solid-js';

const getJobs = query(async (search = '') => {
  'use server';
  search = `%${search.toLowerCase()}%`;
  return await db
    .select()
    .from(jobs)
    .where(or(like(jobs.title, search), or(like(jobs.company, search))));
}, 'jobs');

export const route = {
  preload: () => getJobs(),
} satisfies RouteDefinition;

const HEADERS = [
  'id',
  'createdAt',
  'updatedAt',
  'title',
  'company',
  'remote',
  'location',
  'timeSincePosted',
  'companySize',
  'link',
] satisfies (keyof Job)[];

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

  return (
    <main class="p-4 max-w-7xl mx-auto">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="mb-4">
          <input
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
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="w-full">
            <thead>
              <tr class="bg-gray-50">
                <For each={HEADERS}>
                  {(header) => (
                    <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      {header}
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={tableData()}>
                {(row) => (
                  <tr class="hover:bg-gray-50">
                    <For each={HEADERS}>
                      {(header) => (
                        <td class="px-4 py-3 text-sm text-gray-700 border-b">
                          <Show
                            when={
                              typeof row?.[header] === 'string' &&
                              row[header].startsWith('https://')
                            }
                            fallback={row[header]}
                          >
                            <a href={row[header] as string} target="_blank">
                              Link
                            </a>
                          </Show>
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        <div class="mt-4 text-sm text-gray-500">
          Showing {tableData()?.length} of {tableData()?.length} records
        </div>
      </div>
    </main>
  );
};

export default JobTable;
