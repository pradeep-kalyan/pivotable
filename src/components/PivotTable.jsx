import React from "react";

function PivotTable({ pivotData, rows, columns, valueFields, divRef }) {
  if (
    !pivotData?.pivotTables ||
    Object.keys(pivotData.pivotTables).length === 0
  ) {
    return (
      <div className="p-4 text-center text-teal-600 border border-sand-200 rounded-lg bg-sand-50">
        No data to display
      </div>
    );
  }

  // Function to determine cell color based on value
  const getCellColor = (value, max) => {
    if (value === 0 || value == null) return "bg-sand-50";
    const ratio = value / max;
    const intensity = Math.min(0.9, Math.max(0.1, ratio)) * 100;
    const intensityLevel = Math.round(intensity / 10) * 10;
    return `bg-teal-${intensityLevel}`;
  };

  // Format value based on the aggregation type
  const formatValue = (value, aggregationType) => {
    if (value == null) return "-";
    const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
    return Number.isInteger(numValue)
      ? Math.round(numValue).toLocaleString()
      : numValue.toFixed(2).toLocaleString();
  };

  // Extract aggregation type from header
  const getAggregationFromHeader = (header) => {
    if (!header.includes("(") || !header.includes(")")) return "sum";
    const match = header.match(/\(([^)]+)\)/);
    if (match?.[1]) {
      const aggText = match[1].toLowerCase();
      if (aggText.includes("sum")) return "sum";
      if (aggText.includes("avg")) return "avg";
      if (aggText.includes("count")) return "count";
      if (aggText.includes("min")) return "min";
      if (aggText.includes("max")) return "max";
      if (aggText.includes("distinct")) return "distinct";
    }
    return "sum";
  };

  // Get the unified table or the first table available
  const tableKey = "unified_table";
  const currentTable =
    pivotData.pivotTables[tableKey] ||
    pivotData.pivotTables[Object.keys(pivotData.pivotTables)[0]];

  if (!currentTable?.table?.length) {
    return (
      <div className="p-4 text-center text-teal-600 border border-sand-200 rounded-lg bg-sand-50">
        Table has no data
      </div>
    );
  }

  return (
    <div className="p-4 w-full shadow-sm overflow-auto" ref={divRef}>
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-teal-800 text-center font-audio">
            Pivot Table
            {rows.length > 0 && (
              <span className="text-teal-700"> by {rows.join(", ")}</span>
            )}
            {columns.length > 0 && (
              <span className="text-sand-700"> and {columns.join(", ")}</span>
            )}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-teal-100">
                {currentTable.table[0].map((cell, index) => {
                  let displayCell = cell;
                  if (index >= rows.length && !cell.startsWith("Total")) {
                    const matchedField = valueFields.find((vf) =>
                      cell.includes(vf.field)
                    );
                    if (
                      matchedField &&
                      !cell.includes(matchedField.aggregation)
                    ) {
                      displayCell = `${cell} (${matchedField.aggregation})`;
                    }
                  }
                  return (
                    <th
                      key={index}
                      className={`border border-sand-200 px-4 py-3 text-left font-semibold text-teal-800
                      ${index < rows.length ? "bg-teal-200" : "bg-teal-100"}
                      ${cell.startsWith("Total (") ? "bg-sand-200" : ""}`}
                    >
                      {displayCell}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {currentTable.table.slice(1).map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={
                    rowIdx % 2 === 0 ? "table-row-even" : "table-row-odd"
                  }
                >
                  {row.map((cell, cellIdx) => {
                    const headerRow = currentTable.table[0];

                    // Row headers
                    if (cellIdx < rows.length) {
                      return (
                        <td
                          key={cellIdx}
                          className="border border-sand-200 px-4 py-2 font-medium bg-teal-50"
                        >
                          {cell === "" ? "-" : cell}
                        </td>
                      );
                    }

                    // Data cells
                    const header = headerRow[cellIdx];
                    let aggregationType = "sum";

                    // Find matching value field
                    for (const vf of valueFields) {
                      if (header.includes(vf.field)) {
                        aggregationType = vf.aggregation;
                        break;
                      }
                    }

                    if (aggregationType === "sum") {
                      aggregationType = getAggregationFromHeader(header);
                    }

                    const isTotal = header.startsWith("Total (");
                    const columnValues = currentTable.table
                      .slice(1)
                      .map((r) =>
                        typeof r[cellIdx] === "number"
                          ? r[cellIdx]
                          : parseFloat(r[cellIdx]) || 0
                      )
                      .filter((v) => !isNaN(v) && v !== 0);

                    const maxValue =
                      columnValues.length > 0 ? Math.max(...columnValues) : 1;
                    const numValue =
                      typeof cell === "number" ? cell : parseFloat(cell) || 0;
                    const cellColor =
                      numValue > 0 && !isTotal
                        ? getCellColor(numValue, maxValue)
                        : "";

                    return (
                      <td
                        key={cellIdx}
                        className={`border border-sand-200 px-4 py-2 text-right 
                        ${isTotal ? "font-bold bg-sand-100" : cellColor}`}
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
      </div>
    </div>
  );
}

export default PivotTable;
