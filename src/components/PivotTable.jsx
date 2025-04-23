import React, { useState } from "react";

/**
 * Enhanced PivotTable Component to display multiple tables with different aggregations
 */
function PivotTable({ pivotData, rows, columns, valueFields }) {
  // State to track which pivot table is currently active
  const [activeTable, setActiveTable] = useState(
    pivotData?.pivotTables && Object.keys(pivotData.pivotTables).length > 0
      ? Object.keys(pivotData.pivotTables)[0]
      : null
  );

  if (
    !pivotData ||
    !pivotData.pivotTables ||
    Object.keys(pivotData.pivotTables).length === 0
  ) {
    return (
      <div className="p-4 text-center text-gray-500 border border-gray-300 rounded-lg">
        No data to display
      </div>
    );
  }

  // Get all available tables
  const tableKeys = Object.keys(pivotData.pivotTables);

  // Get the current table data
  const currentTableData = pivotData.pivotTables[activeTable];
  if (
    !currentTableData ||
    !currentTableData.table ||
    !currentTableData.table.length
  ) {
    return (
      <div className="p-4 text-center text-gray-500 border border-gray-300 rounded-lg">
        Selected table has no data
      </div>
    );
  }

  // Format field names for display
  const formatTableName = (field, aggregation) => {
    const aggLabel =
      {
        sum: "Sum of",
        avg: "Average of",
        count: "Count of",
        min: "Minimum of",
        max: "Maximum of",
        distinct: "Distinct count of",
      }[aggregation] || aggregation;

    return `${aggLabel} ${field}`;
  };

  // The headers will be in the first row of the current table
  const headerRow = currentTableData.table[0];
  const dataRows = currentTableData.table.slice(1);

  // Format value as currency or number based on the first non-zero value
  const formatValue = (value, aggregationType) => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return "-";
    }

    // Check if it's a number
    const numValue = typeof value === "number" ? value : parseFloat(value) || 0;

    // Count values are always integers
    if (aggregationType === "count" || aggregationType === "distinct") {
      return Math.round(numValue).toLocaleString();
    }

    // Format with appropriate precision
    if (Math.abs(numValue) >= 1000000) {
      return `${(numValue / 1000000).toFixed(2)}M`;
    } else if (Math.abs(numValue) >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    } else if (Number.isInteger(numValue)) {
      return numValue.toLocaleString();
    } else {
      return numValue.toFixed(2).toLocaleString();
    }
  };

  // Function to determine cell color based on value (for heat map effect)
  const getCellColor = (value, max, aggregationType) => {
    if (value === 0 || value === null) return "bg-gray-50";

    // Different coloring for different aggregation types
    let baseColor;
    switch (aggregationType) {
      case "sum":
        baseColor = "blue";
        break;
      case "avg":
        baseColor = "green";
        break;
      case "count":
      case "distinct":
        baseColor = "purple";
        break;
      case "min":
        baseColor = "teal";
        break;
      case "max":
        baseColor = "amber";
        break;
      default:
        baseColor = "blue";
    }

    const intensity = Math.min(0.9, Math.max(0.1, value / max)) * 100;
    return `bg-${baseColor}-${Math.round(intensity / 10) * 10}`;
  };

  // Find max value for heat map effect
  const maxValue = dataRows.reduce((max, row) => {
    return Math.max(
      max,
      ...row
        .slice(rows.length)
        .map((val) => (typeof val === "number" ? val : parseFloat(val) || 0))
    );
  }, 0);

  return (
    <div className="p-4 w-full shadow-sm overflow-auto">
      {/* Table selector tabs if there are multiple value fields */}
      {tableKeys.length > 1 && (
        <div className="flex flex-wrap mb-4 gap-2">
          {tableKeys.map((key) => {
            const { field, aggregation } = pivotData.pivotTables[key];
            return (
              <button
                key={key}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    activeTable === key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                onClick={() => setActiveTable(key)}
              >
                {formatTableName(field, aggregation)}
              </button>
            );
          })}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">
        {formatTableName(currentTableData.field, currentTableData.aggregation)}
        {rows.length > 0 && <span> by {rows.join(", ")}</span>}
        {columns.length > 0 && <span> and {columns.join(", ")}</span>}
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-blue-100">
              {/* Render header row */}
              {headerRow.map((cell, index) => (
                <th
                  key={index}
                  className={`
                    border border-gray-300 px-4 py-2 text-left
                    ${index >= rows.length ? "bg-blue-200" : ""}
                    ${index === headerRow.length - 1 ? "bg-blue-300" : ""}
                  `}
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Render data rows */}
            {dataRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={rowIdx % 2 === 0 ? "bg-gray-50" : "bg-white"}
              >
                {row.map((cell, cellIdx) => {
                  // Format based on cell type
                  if (cellIdx < rows.length) {
                    // Row headers
                    return (
                      <td
                        key={cellIdx}
                        className="border border-gray-300 px-4 py-2 font-medium bg-gray-100"
                      >
                        {cell}
                      </td>
                    );
                  } else if (cellIdx === row.length - 1) {
                    // Row totals (last column)
                    return (
                      <td
                        key={cellIdx}
                        className="border border-gray-300 px-4 py-2 text-right font-bold bg-yellow-50"
                      >
                        {formatValue(cell, currentTableData.aggregation)}
                      </td>
                    );
                  } else {
                    // Data cells
                    const numValue =
                      typeof cell === "number" ? cell : parseFloat(cell) || 0;
                    const cellColor =
                      numValue > 0
                        ? getCellColor(
                            numValue,
                            maxValue,
                            currentTableData.aggregation
                          )
                        : "";

                    return (
                      <td
                        key={cellIdx}
                        className={`border border-gray-300 px-4 py-2 text-right ${cellColor}`}
                      >
                        {formatValue(numValue, currentTableData.aggregation)}
                      </td>
                    );
                  }
                })}
              </tr>
            ))}

            {/* Add column totals row */}
            <tr className="bg-blue-50 font-bold">
              <td
                colSpan={rows.length}
                className="border border-gray-300 px-4 py-2 bg-blue-100"
              >
                Grand Total
              </td>

              {dataRows[dataRows.length - 1]
                .slice(rows.length)
                .map((total, idx) => (
                  <td
                    key={idx}
                    className={`
                    border border-gray-300 px-4 py-2 text-right
                    ${
                      idx ===
                      dataRows[dataRows.length - 1].slice(rows.length).length -
                        1
                        ? "bg-blue-200"
                        : ""
                    }
                  `}
                  >
                    {formatValue(total, currentTableData.aggregation)}
                  </td>
                ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-2">
        Note: K = thousands, M = millions
      </div>
    </div>
  );
}

export default PivotTable;
