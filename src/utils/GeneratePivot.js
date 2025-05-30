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
  // Create a map for header indices
  const headerIndices = {};
  headers.forEach((header, idx) => {
    headerIndices[header] = idx;
  });

  // Create a result object with multiple pivot tables
  const result = {
    pivotTables: {},
  };

  // Skip processing if we have no data
  if (!data || data.length <= 1) {
    return result;
  }

  // Skip header row if it exists
  const records = data.slice(1);

  // Get the indices for all dimensions
  const rowIndices = rows.map((r) => headerIndices[r]);
  const colIndices = columns.map((c) => headerIndices[c]);

  // Create unique row and column combinations
  const uniqueRows = new Map();
  const uniqueCols = new Map();

  // Collect all unique row and column combinations
  records.forEach((record) => {
    // Create keys for the row and column combinations
    const rowKey = JSON.stringify(rowIndices.map((idx) => record[idx] ?? ""));
    const colKey = JSON.stringify(colIndices.map((idx) => record[idx] ?? ""));

    if (!uniqueRows.has(rowKey)) {
      uniqueRows.set(
        rowKey,
        rowIndices.map((idx) => record[idx] ?? "")
      );
    }

    if (!uniqueCols.has(colKey)) {
      uniqueCols.set(
        colKey,
        colIndices.map((idx) => record[idx] ?? "")
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

  // Create a unified table with all value fields
  const unifiedTableKey = "unified_table";

  // Initialize data matrix with empty aggregation objects for each value field
  const dataMatrix = {};
  sortedUniqueRows.forEach((row) => {
    const rowKey = JSON.stringify(row);
    dataMatrix[rowKey] = {};

    sortedUniqueCols.forEach((col) => {
      const colKey = JSON.stringify(col);
      dataMatrix[rowKey][colKey] = {};

      // Initialize for each value field
      valueFields.forEach(({ field, aggregation }) => {
        dataMatrix[rowKey][colKey][`${field}_${aggregation}`] =
          initAggregation(aggregation);
      });
    });

    // Initialize row totals for each value field
    dataMatrix[rowKey]["total"] = {};
    valueFields.forEach(({ field, aggregation }) => {
      dataMatrix[rowKey]["total"][`${field}_${aggregation}`] =
        initAggregation(aggregation);
    });
  });

  // Initialize column totals
  dataMatrix["total"] = {};
  sortedUniqueCols.forEach((col) => {
    const colKey = JSON.stringify(col);
    dataMatrix["total"][colKey] = {};

    // Initialize for each value field
    valueFields.forEach(({ field, aggregation }) => {
      dataMatrix["total"][colKey][`${field}_${aggregation}`] =
        initAggregation(aggregation);
    });
  });

  // Grand total for each value field
  dataMatrix["total"]["total"] = {};
  valueFields.forEach(({ field, aggregation }) => {
    dataMatrix["total"]["total"][`${field}_${aggregation}`] =
      initAggregation(aggregation);
  });

  // Aggregate the data for all value fields
  records.forEach((record) => {
    const rowKey = JSON.stringify(rowIndices.map((idx) => record[idx] ?? ""));
    const colKey = JSON.stringify(colIndices.map((idx) => record[idx] ?? ""));

    // Skip if we don't have valid row or column keys
    if (!dataMatrix[rowKey] || !dataMatrix[rowKey][colKey]) {
      return;
    }

    // Process each value field
    valueFields.forEach(({ field, aggregation }) => {
      const valueIndex = headerIndices[field];

      // Skip if we can't find the value field
      if (valueIndex === undefined) {
        return;
      }

      const value = record[valueIndex];
      const fieldKey = `${field}_${aggregation}`;

      updateAggregation(
        dataMatrix[rowKey][colKey][fieldKey],
        value,
        aggregation
      );
      updateAggregation(
        dataMatrix[rowKey]["total"][fieldKey],
        value,
        aggregation
      );
      updateAggregation(
        dataMatrix["total"][colKey][fieldKey],
        value,
        aggregation
      );
      updateAggregation(
        dataMatrix["total"]["total"][fieldKey],
        value,
        aggregation
      );
    });
  });

  // Convert to final representation (unified table format)
  const unifiedTable = [];

  // Header row - includes all value fields for each column
  const headerRow = [...rows];

  // For each column, add all value fields
  sortedUniqueCols.forEach((col) => {
    // Improve column labels by handling empty values
    const colValues = col.map((val) => (val === "" ? "(Empty)" : val));
    const colLabel = colValues.join(" - ");

    valueFields.forEach(({ field, aggregation }) => {
      headerRow.push(`${colLabel} (${field} ${aggregation})`);
    });
  });

  // Add totals for each value field
  valueFields.forEach(({ field, aggregation }) => {
    headerRow.push(`Total (${field} ${aggregation})`);
  });

  unifiedTable.push(headerRow);

  // Data rows
  sortedUniqueRows.forEach((row) => {
    const rowKey = JSON.stringify(row);
    // Improve row labels by handling empty values
    const rowValues = row.map((val) => (val === "" ? "(Empty)" : val));
    const tableRow = [...rowValues];

    // Add values for each column and value field
    sortedUniqueCols.forEach((col) => {
      const colKey = JSON.stringify(col);

      // Add each value field for this column
      valueFields.forEach(({ field, aggregation }) => {
        const fieldKey = `${field}_${aggregation}`;
        tableRow.push(
          getFinalValue(dataMatrix[rowKey][colKey][fieldKey], aggregation)
        );
      });
    });

    // Add row totals for each value field
    valueFields.forEach(({ field, aggregation }) => {
      const fieldKey = `${field}_${aggregation}`;
      tableRow.push(
        getFinalValue(dataMatrix[rowKey]["total"][fieldKey], aggregation)
      );
    });

    unifiedTable.push(tableRow);
  });

  // Add totals row
  const totalsRow = ["Total"];
  // Fill with empty values for any additional row dimensions
  for (let i = 1; i < rows.length; i++) {
    totalsRow.push("");
  }

  // Add column totals for each value field
  sortedUniqueCols.forEach((col) => {
    const colKey = JSON.stringify(col);

    // Add each value field total for this column
    valueFields.forEach(({ field, aggregation }) => {
      const fieldKey = `${field}_${aggregation}`;
      totalsRow.push(
        getFinalValue(dataMatrix["total"][colKey][fieldKey], aggregation)
      );
    });
  });

  // Add grand totals for each value field
  valueFields.forEach(({ field, aggregation }) => {
    const fieldKey = `${field}_${aggregation}`;
    totalsRow.push(
      getFinalValue(dataMatrix["total"]["total"][fieldKey], aggregation)
    );
  });

  unifiedTable.push(totalsRow);

  // Add the unified table to the result
  result.pivotTables[unifiedTableKey] = {
    field: "Multiple Fields",
    aggregation: "Multiple",
    table: unifiedTable,
  };

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
      agg.values.add(String(value));
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
      // Fix: Ensure we don't divide by zero and round to reasonable precision
      return agg.count > 0 ? Number((agg.sum / agg.count).toFixed(4)) : 0;
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
