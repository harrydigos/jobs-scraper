import { createSignal, For, Show, createMemo } from 'solid-js';

interface TableData {
  headers: string[];
  rows: Record<string, string>[];
}

const CSVViewer = () => {
  const [tableData, setTableData] = createSignal<TableData>({
    headers: [],
    rows: [],
  });
  const [error, setError] = createSignal<string>('');
  const [searchTerm, setSearchTerm] = createSignal('');

  const filteredRows = createMemo(() => {
    const term = searchTerm().toLowerCase();
    if (!term) return tableData().rows;

    return tableData().rows.filter((row) =>
      Object.values(row).some((value) => value.toLowerCase().includes(term)),
    );
  });

  const processCSV = (csv: string) => {
    try {
      const lines = csv.split('\n');
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse headers
      const headerRow = lines[0];
      const headers = headerRow.split(',').map((header) => header.trim().replace(/^"(.*)"$/, '$1'));

      // Parse data rows
      const rows = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(',');
          const row: Record<string, string> = {};

          let currentValue = '';
          let withinQuotes = false;
          let currentColumn = 0;

          // Handle quoted values that might contain commas
          for (let i = 0; i < values.length; i++) {
            let value = values[i].trim();

            if (!withinQuotes && value.startsWith('"') && !value.endsWith('"')) {
              withinQuotes = true;
              currentValue = value.slice(1);
            } else if (withinQuotes && value.endsWith('"')) {
              withinQuotes = false;
              currentValue += ',' + value.slice(0, -1);
              row[headers[currentColumn]] = currentValue;
              currentValue = '';
              currentColumn++;
            } else if (withinQuotes) {
              currentValue += ',' + value;
            } else {
              value = value.replace(/^"(.*)"$/, '$1');
              row[headers[currentColumn]] = value;
              currentColumn++;
            }
          }

          return row;
        });

      setTableData({ headers, rows });
      setError('');
      setSearchTerm('');
    } catch (err) {
      setError("Error processing CSV file. Please ensure it's properly formatted.");
      console.error(err);
    }
  };

  const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processCSV(text);
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleSearch = (event: Event) => {
    const input = event.target as HTMLInputElement;
    setSearchTerm(input.value);
  };

  return (
    <div class="p-4 max-w-7xl mx-auto">
      <div class="bg-white rounded-lg shadow p-6">
        <h1 class="text-2xl font-semibold mb-6 text-gray-900">CSV File Viewer</h1>

        <div class="mb-6">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            class="w-full px-3 py-2 border border-gray-200 rounded-md text-sm
                   file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
                   file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                   hover:file:bg-blue-100 focus:outline-none focus:ring-2
                   focus:ring-blue-500 focus:ring-opacity-50"
          />
        </div>

        <Show when={error()}>
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <span>⚠️</span> {error()}
          </div>
        </Show>

        <Show when={tableData().headers.length > 0}>
          <div class="mb-4">
            <input
              type="text"
              placeholder="Search in all columns..."
              value={searchTerm()}
              onInput={handleSearch}
              class="w-full px-4 py-2 border border-gray-200 rounded-md text-sm
                     placeholder-gray-400 focus:outline-none focus:ring-2
                     focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50">
                  <For each={tableData().headers}>
                    {(header) => (
                      <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                        {header}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={filteredRows()}>
                  {(row) => (
                    <tr class="hover:bg-gray-50">
                      <For each={tableData().headers}>
                        {(header) => (
                          <td class="px-4 py-3 text-sm text-gray-700 border-b">
                            <Show when={row[header]?.startsWith('https://')} fallback={row[header]}>
                              <a href={row[header]} target="_blank">
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
            Showing {filteredRows().length} of {tableData().rows.length} records
          </div>
        </Show>
      </div>
    </div>
  );
};

export default CSVViewer;
