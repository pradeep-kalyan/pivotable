/**
 * Generate a pivot table with multiple value fields from raw data
 * @param {Array} data - The raw data array
 * @param {Array} headers - The column headers
 * @param {Array} rows - The row dimensions
 * @param {Array} columns - The column dimensions
 * @param {Array} valueFields - Array of objects with field and aggregation properties
 * @returns {Object} - The pivot table data
 */
export function generatePivotTable(data, headers, rows, columns, valueFields) {
  // Skip header row
  const records = data.slice(1);

  // Create a map for header indices
  const headerIndices = {};
  headers.forEach((header, idx) => {
    headerIndices[header] = idx;
  });

  // Create a result object with multiple pivot tables
  const result = {
    pivotTables: {},
  };

  // Process each value field with its aggregation
  valueFields.forEach(({ field, aggregation }) => {
    const tableKey = `${field}_${aggregation}`;

    // Get the indices for all dimensions
    const rowIndices = rows.map((r) => headerIndices[r]);
    const colIndices = columns.map((c) => headerIndices[c]);
    const valueIndex = headerIndices[field];

    // Create unique row and column combinations
    const uniqueRows = new Map();
    const uniqueCols = new Map();

    records.forEach((record) => {
      // Create keys for the row and column combinations
      const rowKey = JSON.stringify(rowIndices.map((idx) => record[idx]));
      const colKey = JSON.stringify(colIndices.map((idx) => record[idx]));

      if (!uniqueRows.has(rowKey)) {
        uniqueRows.set(
          rowKey,
          rowIndices.map((idx) => record[idx])
        );
      }

      if (!uniqueCols.has(colKey)) {
        uniqueCols.set(
          colKey,
          colIndices.map((idx) => record[idx])
        );
      }
    });

    // Convert to arrays and sort
    const sortedUniqueRows = [...uniqueRows.values()].sort((a, b) => {
      for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
      }
      return 0;
    });

    const sortedUniqueCols = [...uniqueCols.values()].sort((a, b) => {
      for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
      }
      return 0;
    });

    // Initialize data matrix with empty aggregation objects
    const dataMatrix = {};
    sortedUniqueRows.forEach((row) => {
      const rowKey = JSON.stringify(row);
      dataMatrix[rowKey] = {};

      sortedUniqueCols.forEach((col) => {
        const colKey = JSON.stringify(col);
        dataMatrix[rowKey][colKey] = initAggregation(aggregation);
      });

      // Initialize row total
      dataMatrix[rowKey]["total"] = initAggregation(aggregation);
    });

    // Initialize column totals
    dataMatrix["total"] = {};
    sortedUniqueCols.forEach((col) => {
      const colKey = JSON.stringify(col);
      dataMatrix["total"][colKey] = initAggregation(aggregation);
    });

    // Grand total
    dataMatrix["total"]["total"] = initAggregation(aggregation);

    // Aggregate the data
    records.forEach((record) => {
      const rowKey = JSON.stringify(rowIndices.map((idx) => record[idx]));
      const colKey = JSON.stringify(colIndices.map((idx) => record[idx]));
      const value = record[valueIndex];

      updateAggregation(dataMatrix[rowKey][colKey], value, aggregation);
      updateAggregation(dataMatrix[rowKey]["total"], value, aggregation);
      updateAggregation(dataMatrix["total"][colKey], value, aggregation);
      updateAggregation(dataMatrix["total"]["total"], value, aggregation);
    });

    // Convert to final representation (table format)
    const table = [];

    // Header row
    const headerRow = [
      ...rows,
      ...sortedUniqueCols.map((col) => col.join(" - ")),
      "Total",
    ];
    table.push(headerRow);

    // Data rows
    sortedUniqueRows.forEach((row) => {
      const rowKey = JSON.stringify(row);
      const tableRow = [...row];

      // Add values for each column
      sortedUniqueCols.forEach((col) => {
        const colKey = JSON.stringify(col);
        tableRow.push(getFinalValue(dataMatrix[rowKey][colKey], aggregation));
      });

      // Add row total
      tableRow.push(getFinalValue(dataMatrix[rowKey]["total"], aggregation));

      table.push(tableRow);
    });

    // Add totals row
    const totalsRow = ["Total"];
    // Fill with empty values for any additional row dimensions
    for (let i = 1; i < rows.length; i++) {
      totalsRow.push("");
    }

    // Add column totals
    sortedUniqueCols.forEach((col) => {
      const colKey = JSON.stringify(col);
      totalsRow.push(getFinalValue(dataMatrix["total"][colKey], aggregation));
    });

    // Add grand total
    totalsRow.push(getFinalValue(dataMatrix["total"]["total"], aggregation));

    table.push(totalsRow);

    // Add this table to the result
    result.pivotTables[tableKey] = {
      field,
      aggregation,
      table,
    };
  });

  return result;
}

/**
 * Initialize an aggregation object based on the aggregation type
 * @param {string} aggregationType - The type of aggregation
 * @returns {Object} - Initialized aggregation object
 */
function initAggregation(aggregationType) {
  switch (aggregationType) {
    case "sum":
    case "count":
      return { value: 0 };

    case "avg":
      return { sum: 0, count: 0 };

    case "min":
      return { value: Infinity };

    case "max":
      return { value: -Infinity };

    case "distinct":
      return { values: new Set() };

    default:
      return { value: 0 };
  }
}

/**
 * Update an aggregation object with a new value
 * @param {Object} agg - The aggregation object
 * @param {*} value - The new value to incorporate
 * @param {string} aggregationType - The type of aggregation
 */
function updateAggregation(agg, value, aggregationType) {
  // Skip empty values
  if (value === null || value === undefined || value === "") {
    return;
  }

  // Convert string numbers to actual numbers
  const numValue = typeof value === "number" ? value : parseFloat(value);

  switch (aggregationType) {
    case "sum":
      if (!isNaN(numValue)) {
        agg.value += numValue;
      }
      break;

    case "count":
      agg.value += 1;
      break;

    case "avg":
      if (!isNaN(numValue)) {
        agg.sum += numValue;
        agg.count += 1;
      }
      break;

    case "min":
      if (!isNaN(numValue) && numValue < agg.value) {
        agg.value = numValue;
      }
      break;

    case "max":
      if (!isNaN(numValue) && numValue > agg.value) {
        agg.value = numValue;
      }
      break;

    case "distinct":
      // Add the original value to the set
      agg.values.add(value.toString());
      break;
  }
}

/**
 * Get the final value from an aggregation object
 * @param {Object} agg - The aggregation object
 * @param {string} aggregationType - The type of aggregation
 * @returns {number|string} - The final calculated value
 */
function getFinalValue(agg, aggregationType) {
  switch (aggregationType) {
    case "sum":
    case "count":
      return agg.value;

    case "avg":
      return agg.count > 0 ? agg.sum / agg.count : 0;

    case "min":
      return agg.value === Infinity ? 0 : agg.value;

    case "max":
      return agg.value === -Infinity ? 0 : agg.value;

    case "distinct":
      return agg.values.size;

    default:
      return 0;
  }
}
