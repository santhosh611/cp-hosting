import React from 'react';

const Table = ({
  headers,
  data,
  renderRow,
  emptyMessage = "No data available."
}) => {
  return (
    // MODIFIED: Wrapped the table in a div with overflow-x-auto
    // This makes the table scroll horizontally on small screens if it's too wide,
    // without breaking the overall page layout.
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full leading-normal">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item, index) => renderRow(item, index))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;