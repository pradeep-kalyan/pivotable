import React, { useState } from "react";

function PivotTable({ pivotData, rows, columns, valueFields }) {
  // For toggling between table view and card view
  const [viewMode, setViewMode] = useState("unified"); // 'unified' or 'tabbed'

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

  // Format field names for display
  const formatTableName = (field, aggregation) => {
    if (field === "Multiple Fields" && aggregation === "Multiple") {
      return "Combined Pivot Table (All Fields)";
    }

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

  // Render unified view - all tables in one view
  if (viewMode === "unified") {
    return (
      <div className="p-4 w-full shadow-sm overflow-auto">
        {/* View mode toggle */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Pivot Analysis</h2>
          <div className="flex items-center gap-3">
            <button
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === "unified"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => setViewMode("unified")}
            >
              Unified View
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === "tabbed" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
              onClick={() => setViewMode("tabbed")}
            >
              Tabbed View
            </button>
          </div>
        </div>

        {/* Tables container */}
        <div className="space-y-8">
          {/* Show the unified table first if it exists */}
          {tableKeys.includes("unified_table") && (
            <div
              key="unified_table"
              className="bg-white rounded-lg border border-gray-300 shadow-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-indigo-50 to-purple-100 p-3 border-b border-gray-300">
                <h3 className="text-lg font-semibold text-gray-800">
                  Combined Pivot Table (All Fields)
                  {rows.length > 0 && (
                    <span className="text-blue-700"> by {rows.join(", ")}</span>
                  )}
                  {columns.length > 0 && (
                    <span className="text-green-700">
                      {" "}
                      and {columns.join(", ")}
                    </span>
                  )}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      {/* Render header row */}
                      {pivotData.pivotTables["unified_table"].table[0].map(
                        (cell, index) => (
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
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {/* Render data rows */}
                    {pivotData.pivotTables["unified_table"].table
                      .slice(1)
                      .map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={
                            rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          {row.map((cell, cellIdx) => {
                            const headerRow =
                              pivotData.pivotTables["unified_table"].table[0];

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
                            const columnValues = pivotData.pivotTables[
                              "unified_table"
                            ].table
                              .slice(1)
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
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500 p-2 bg-gray-50 border-t border-gray-300">
                Note: K = thousands, M = millions
              </div>
            </div>
          )}

          {/* Show individual tables (excluding the unified table) */}
          {tableKeys
            .filter((key) => key !== "unified_table")
            .map((key) => {
              const currentTableData = pivotData.pivotTables[key];

              if (
                !currentTableData ||
                !currentTableData.table ||
                !currentTableData.table.length
              ) {
                return null;
              }

              // The headers will be in the first row of the current table
              const headerRow = currentTableData.table[0];
              const dataRows = currentTableData.table.slice(1);

              // Find max value for heat map effect
              const maxValue = dataRows.reduce((max, row) => {
                return Math.max(
                  max,
                  ...row
                    .slice(rows.length)
                    .map((val) =>
                      typeof val === "number" ? val : parseFloat(val) || 0
                    )
                );
              }, 0);

              return (
                <div
                  key={key}
                  className="bg-white rounded-lg border border-gray-300 shadow-md overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 border-b border-gray-300">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {formatTableName(
                        currentTableData.field,
                        currentTableData.aggregation
                      )}
                      {rows.length > 0 && (
                        <span className="text-blue-700">
                          {" "}
                          by {rows.join(", ")}
                        </span>
                      )}
                      {columns.length > 0 && (
                        <span className="text-green-700">
                          {" "}
                          and {columns.join(", ")}
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          {/* Render header row */}
                          {headerRow.map((cell, index) => (
                            <th
                              key={index}
                              className={`
                                border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700
                                ${index >= rows.length ? "bg-blue-100" : ""}
                                ${
                                  index === headerRow.length - 1
                                    ? "bg-yellow-100"
                                    : ""
                                }
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
                            className={
                              rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            {row.map((cell, cellIdx) => {
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
                              // Row totals (last column)
                              else if (cellIdx === row.length - 1) {
                                return (
                                  <td
                                    key={cellIdx}
                                    className="border border-gray-300 px-4 py-2 text-right font-bold bg-yellow-50"
                                  >
                                    {formatValue(
                                      cell,
                                      currentTableData.aggregation
                                    )}
                                  </td>
                                );
                              }
                              // Data cells
                              else {
                                const numValue =
                                  typeof cell === "number"
                                    ? cell
                                    : parseFloat(cell) || 0;
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
                                    {formatValue(
                                      cell,
                                      currentTableData.aggregation
                                    )}
                                  </td>
                                );
                              }
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-xs text-gray-500 p-2 bg-gray-50 border-t border-gray-300">
                    Note: K = thousands, M = millions
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  // Tabbed view - show one table at a time
  else {
    // State for active tab in tabbed mode
    const [activeTab, setActiveTab] = useState(tableKeys[0]);

    const currentTableData = pivotData.pivotTables[activeTab];
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

    const headerRow = currentTableData.table[0];
    const dataRows = currentTableData.table.slice(1);

    // Special handling for unified table
    const isUnifiedTable = activeTab === "unified_table";

    return (
      <div className="p-4 w-full shadow-sm overflow-auto">
        {/* View mode toggle */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Pivot Analysis</h2>
          <div className="flex items-center gap-3">
            <button
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === "unified"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => setViewMode("unified")}
            >
              Unified View
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === "tabbed" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
              onClick={() => setViewMode("tabbed")}
            >
              Tabbed View
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tableKeys.map((key) => {
            const { field, aggregation } = pivotData.pivotTables[key];
            return (
              <button
                key={key}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    activeTab === key
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                onClick={() => setActiveTab(key)}
              >
                {formatTableName(field, aggregation)}
              </button>
            );
          })}
        </div>

        {/* Active table */}
        <div className="bg-white rounded-lg border border-gray-300 shadow-md overflow-hidden">
          <div
            className={`p-3 border-b border-gray-300 ${
              isUnifiedTable
                ? "bg-gradient-to-r from-indigo-50 to-purple-100"
                : "bg-gradient-to-r from-blue-50 to-blue-100"
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-800">
              {formatTableName(
                currentTableData.field,
                currentTableData.aggregation
              )}
              {rows.length > 0 && (
                <span className="text-blue-700"> by {rows.join(", ")}</span>
              )}
              {columns.length > 0 && (
                <span className="text-green-700">
                  {" "}
                  and {columns.join(", ")}
                </span>
              )}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {/* Render header row */}
                  {headerRow.map((cell, index) => (
                    <th
                      key={index}
                      className={`
                        border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700
                        ${index >= rows.length ? "bg-blue-100" : ""}
                        ${
                          isUnifiedTable
                            ? cell.startsWith("Total (")
                              ? "bg-yellow-100"
                              : ""
                            : index === headerRow.length - 1
                            ? "bg-yellow-100"
                            : ""
                        }
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
                    className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    {row.map((cell, cellIdx) => {
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

                      // For unified table
                      if (isUnifiedTable) {
                        const header = headerRow[cellIdx];
                        const aggregationType =
                          getAggregationFromHeader(header);
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
                            ? getCellColor(numValue, maxValue, aggregationType)
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
                      }

                      // For regular tables
                      // Row totals (last column)
                      else if (cellIdx === row.length - 1) {
                        return (
                          <td
                            key={cellIdx}
                            className="border border-gray-300 px-4 py-2 text-right font-bold bg-yellow-50"
                          >
                            {formatValue(cell, currentTableData.aggregation)}
                          </td>
                        );
                      }
                      // Data cells
                      else {
                        const numValue =
                          typeof cell === "number"
                            ? cell
                            : parseFloat(cell) || 0;

                        // Find max value for heat map effect
                        const maxValue = dataRows.reduce((max, row) => {
                          return Math.max(
                            max,
                            ...row
                              .slice(rows.length, row.length - 1)
                              .map((val) =>
                                typeof val === "number"
                                  ? val
                                  : parseFloat(val) || 0
                              )
                          );
                        }, 0);

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
                            {formatValue(cell, currentTableData.aggregation)}
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-gray-500 p-2 bg-gray-50 border-t border-gray-300">
            Note: K = thousands, M = millions
          </div>
        </div>
      </div>
    );
  }
}

export default PivotTable;
