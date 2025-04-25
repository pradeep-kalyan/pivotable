import React, { useState } from "react";

function PivotTableNew({ pivotData, rows, columns, valueFields }) {
  // For toggling between compact and expanded view
  const [isCompactView, setIsCompactView] = useState(false);
  // For toggling between showing and hiding totals
  const [showTotals, setShowTotals] = useState(true);

  if (
    !pivotData ||
    !pivotData.pivotTables ||
    !pivotData.pivotTables.unified_table ||
    !pivotData.pivotTables.unified_table.table ||
    pivotData.pivotTables.unified_table.table.length === 0
  ) {
    return (
      <div className="p-4 text-center text-gray-500 border border-gray-300 rounded-lg">
        No data to display
      </div>
    );
  }

  // Get the unified table data
  const unifiedTable = pivotData.pivotTables.unified_table.table;
  const headerRow = unifiedTable[0];
  const dataRows = unifiedTable.slice(1);

  // Function to determine cell color based on value
  const getCellColor = (value, max, aggregationType) => {
    if (value === 0 || value === null || value === undefined)
      return "bg-gray-50";

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
      case "Multiple":
        baseColor = "indigo";
        break;
      default:
        baseColor = "blue";
    }

    // Calculate intensity based on value percentage of max
    const intensity = Math.min(0.9, Math.max(0.1, value / max)) * 100;
    const intensityLevel = Math.round(intensity / 10) * 10;
    return `bg-${baseColor}-${intensityLevel}`;
  };

  // Format value based on the aggregation type
  const formatValue = (value, aggregationType) => {
    if (value === null || value === undefined) return "-";

    const numValue = typeof value === "number" ? value : parseFloat(value) || 0;

    if (aggregationType === "count" || aggregationType === "distinct") {
      return Math.round(numValue).toLocaleString();
    }

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

  // Extract aggregation type from header for unified table
  const getAggregationFromHeader = (header) => {
    if (!header.includes("(") || !header.includes(")")) return "sum";

    const match = header.match(/\(([^)]+)\)$/);
    if (match && match[1]) {
      const parts = match[1].split(" ");
      if (parts.length >= 2) {
        return parts[1]; // Return the aggregation part
      }
    }
    return "sum";
  };

  // Get field name from header
  const getFieldFromHeader = (header) => {
    if (!header.includes("(") || !header.includes(")")) return "";

    const match = header.match(/\(([^)]+)\)$/);
    if (match && match[1]) {
      const parts = match[1].split(" ");
      if (parts.length >= 1) {
        return parts[0]; // Return the field part
      }
    }
    return "";
  };

  // Group headers by column dimension for compact view
  const groupedHeaders = {};
  headerRow.slice(rows.length).forEach((header) => {
    if (header.startsWith("Total (")) return;

    // Extract the column dimension part (before the parenthesis)
    const columnPart = header.split(" (")[0];
    if (!groupedHeaders[columnPart]) {
      groupedHeaders[columnPart] = [];
    }
    groupedHeaders[columnPart].push(header);
  });

  // Get unique column dimensions
  const columnDimensions = Object.keys(groupedHeaders);

  // Get unique fields and aggregations for the legend
  const fieldAggregations = new Set();
  headerRow.slice(rows.length).forEach((header) => {
    if (header.startsWith("Total (")) return;

    const aggregationType = getAggregationFromHeader(header);
    const field = getFieldFromHeader(header);
    fieldAggregations.add(`${field} (${aggregationType})`);
  });

  // Create a legend for the color coding
  const aggregationColors = {
    sum: "blue",
    avg: "green",
    count: "purple",
    distinct: "purple",
    min: "teal",
    max: "amber",
    Multiple: "indigo",
  };

  return (
    <div className="p-4 w-full shadow-sm overflow-auto">
      {/* Controls */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-bold text-gray-800">Pivot Analysis</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                !isCompactView ? "bg-blue-600 text-white" : "text-gray-700"
              }`}
              onClick={() => setIsCompactView(false)}
            >
              Expanded View
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                isCompactView ? "bg-blue-600 text-white" : "text-gray-700"
              }`}
              onClick={() => setIsCompactView(true)}
            >
              Compact View
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showTotals}
                onChange={() => setShowTotals(!showTotals)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ms-3 text-sm font-medium text-gray-700">
                Show Totals
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Color Legend:
        </h3>
        <div className="flex flex-wrap gap-3">
          {Array.from(fieldAggregations).map((fieldAgg) => {
            const parts = fieldAgg.split(" (");
            const field = parts[0];
            const aggregation = parts[1].replace(")", "");
            const color = aggregationColors[aggregation] || "blue";

            return (
              <div key={fieldAgg} className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-sm bg-${color}-500 mr-1`}
                ></div>
                <span className="text-xs text-gray-700">
                  {field} ({aggregation})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-300 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-100 p-3 border-b border-gray-300">
          <h3 className="text-lg font-semibold text-gray-800">
            Combined Pivot Table
            {rows.length > 0 && (
              <span className="text-blue-700"> by {rows.join(", ")}</span>
            )}
            {columns.length > 0 && (
              <span className="text-green-700"> and {columns.join(", ")}</span>
            )}
          </h3>
        </div>

        <div className="overflow-x-auto">
          {isCompactView ? (
            // Compact view - group by column dimensions
            <table className="min-w-full border-collapse">
              <thead>
                {/* First header row - column dimensions */}
                <tr className="bg-gray-100">
                  {/* Row dimension headers (spanning multiple rows) */}
                  {rows.map((row, idx) => (
                    <th
                      key={idx}
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700"
                    >
                      {row}
                    </th>
                  ))}

                  {/* Column dimensions */}
                  {columnDimensions.map((colDim, idx) => (
                    <th
                      key={idx}
                      colSpan={groupedHeaders[colDim].length}
                      className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700 bg-blue-100"
                    >
                      {colDim}
                    </th>
                  ))}

                  {/* Totals column if enabled */}
                  {showTotals && (
                    <th
                      rowSpan={2}
                      className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 bg-yellow-100"
                    >
                      Totals
                    </th>
                  )}
                </tr>

                {/* Second header row - field and aggregation */}
                <tr className="bg-gray-100">
                  {/* For each column dimension, show all field+aggregation combinations */}
                  {columnDimensions.map((colDim) =>
                    groupedHeaders[colDim].map((header, idx) => {
                      const field = getFieldFromHeader(header);
                      const agg = getAggregationFromHeader(header);
                      return (
                        <th
                          key={`${colDim}-${idx}`}
                          className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 bg-blue-50"
                        >
                          {field} ({agg})
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>

              <tbody>
                {/* Data rows */}
                {dataRows.map((row, rowIdx) => {
                  // Skip the last row if it's a totals row and totals are hidden
                  if (!showTotals && rowIdx === dataRows.length - 1)
                    return null;

                  const isTotal = row[0] === "Total";

                  return (
                    <tr
                      key={rowIdx}
                      className={
                        isTotal
                          ? "bg-yellow-50 font-medium"
                          : rowIdx % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50"
                      }
                    >
                      {/* Row headers */}
                      {row.slice(0, rows.length).map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className={`border border-gray-300 px-4 py-2 font-medium ${
                            isTotal ? "bg-yellow-100" : "bg-gray-100"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}

                      {/* Data cells - grouped by column dimension */}
                      {columnDimensions.map((colDim) =>
                        groupedHeaders[colDim].map((header, idx) => {
                          // Find the index of this header in the original header row
                          const headerIndex = headerRow.indexOf(header);
                          if (headerIndex === -1) return null;

                          const cell = row[headerIndex];
                          const aggregationType =
                            getAggregationFromHeader(header);

                          // Find max value for this column for heat map effect
                          const columnValues = dataRows
                            .map((r) => {
                              const val = r[headerIndex];
                              return typeof val === "number"
                                ? val
                                : parseFloat(val) || 0;
                            })
                            .filter((v) => !isNaN(v));

                          const maxValue = Math.max(...columnValues, 1);

                          // Format the cell
                          const numValue =
                            typeof cell === "number"
                              ? cell
                              : parseFloat(cell) || 0;
                          const cellColor =
                            numValue > 0 && !isTotal
                              ? getCellColor(
                                  numValue,
                                  maxValue,
                                  aggregationType
                                )
                              : "";

                          return (
                            <td
                              key={`${colDim}-${idx}`}
                              className={`border border-gray-300 px-3 py-2 text-right ${
                                isTotal ? "font-bold bg-yellow-50" : cellColor
                              }`}
                            >
                              {formatValue(cell, aggregationType)}
                            </td>
                          );
                        })
                      )}

                      {/* Totals column if enabled */}
                      {showTotals && (
                        <td className="border border-gray-300 px-4 py-2 text-right font-bold bg-yellow-50">
                          {/* Find the first total column for this row */}
                          {headerRow
                            .map((header, idx) => {
                              if (header.startsWith("Total (")) {
                                const aggregationType =
                                  getAggregationFromHeader(header);
                                return formatValue(row[idx], aggregationType);
                              }
                              return null;
                            })
                            .filter(Boolean)[0] || "-"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            // Expanded view - original format
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {/* Render header row */}
                  {headerRow
                    .map((cell, index) => {
                      // Skip total columns if totals are hidden
                      if (!showTotals && cell.startsWith("Total ("))
                        return null;

                      return (
                        <th
                          key={index}
                          className={`
                          border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700
                          ${index >= rows.length ? "bg-blue-100" : ""}
                          ${cell.startsWith("Total (") ? "bg-yellow-100" : ""}
                        `}
                        >
                          {cell}
                        </th>
                      );
                    })
                    .filter(Boolean)}
                </tr>
              </thead>

              <tbody>
                {/* Render data rows */}
                {dataRows.map((row, rowIdx) => {
                  // Skip the last row if it's a totals row and totals are hidden
                  if (!showTotals && rowIdx === dataRows.length - 1)
                    return null;

                  return (
                    <tr
                      key={rowIdx}
                      className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {row
                        .map((cell, cellIdx) => {
                          // Skip total columns if totals are hidden
                          if (
                            !showTotals &&
                            headerRow[cellIdx]?.startsWith("Total (")
                          )
                            return null;

                          // Row headers
                          if (cellIdx < rows.length) {
                            return (
                              <td
                                key={cellIdx}
                                className="border border-gray-300 px-4 py-2 font-medium bg-gray-100"
                              >
                                {cell}
                              </td>
                            );
                          }

                          // Get the header for this cell to determine aggregation type
                          const header = headerRow[cellIdx];
                          const aggregationType =
                            getAggregationFromHeader(header);

                          // Determine if this is a total column
                          const isTotal = header.startsWith("Total (");

                          // Find max value for this column type for heat map effect
                          const columnValues = dataRows
                            .map((r) => {
                              const val = r[cellIdx];
                              return typeof val === "number"
                                ? val
                                : parseFloat(val) || 0;
                            })
                            .filter((v) => !isNaN(v));

                          const maxValue = Math.max(...columnValues, 1);

                          // Format the cell
                          const numValue =
                            typeof cell === "number"
                              ? cell
                              : parseFloat(cell) || 0;
                          const cellColor =
                            numValue > 0 && !isTotal
                              ? getCellColor(
                                  numValue,
                                  maxValue,
                                  aggregationType
                                )
                              : "";

                          return (
                            <td
                              key={cellIdx}
                              className={`border border-gray-300 px-4 py-2 text-right 
                              ${
                                isTotal ? "font-bold bg-yellow-50" : cellColor
                              }`}
                            >
                              {formatValue(cell, aggregationType)}
                            </td>
                          );
                        })
                        .filter(Boolean)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-xs text-gray-500 p-2 bg-gray-50 border-t border-gray-300">
          Note: K = thousands, M = millions
        </div>
      </div>
    </div>
  );
}

export default PivotTableNew;
