import * as XLSX from "xlsx";

/**
 * Process Excel or CSV data with proper date conversion and data type handling
 * @param {ArrayBuffer} fileData - The uploaded file data
 * @returns {Object} - Processed data and headers with data types
 */
export function processExcelData(fileData) {
  const data = new Uint8Array(fileData);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  // Set the dateNF (date number format) option for proper date formatting
  const options = {
    header: 1,
    raw: false,
    dateNF: "yyyy-mm-dd",
  };

  const jsonData = XLSX.utils.sheet_to_json(worksheet, options);

  if (!jsonData || jsonData.length === 0) {
    return null;
  }

  // Format dates properly and detect column types
  const formattedData = jsonData.map((row, rowIndex) => {
    return row.map((cell, cellIndex) => {
      // Check if the cell contains a date value
      if (cell instanceof Date) {
        // Format date as YYYY-MM-DD
        return cell.toISOString().split("T")[0];
      }

      // Check if the cell might be an Excel date number
      if (typeof cell === "number" && cell > 25569 && cell < 50000) {
        // Excel stores dates as days since 1900-01-01 (with some quirks)
        // Convert Excel serial date to JavaScript Date object
        const date = new Date((cell - 25569) * 86400 * 1000);
        return date.toISOString().split("T")[0];
      }

      return cell;
    });
  });

  // Determine the data type for each column
  const headers = formattedData[0] || [];
  const headerTypes = headers.map((header, index) => {
    // Skip the header row and look at the first few data rows
    const sampleValues = formattedData
      .slice(1, Math.min(10, formattedData.length))
      .map((row) => row[index])
      .filter((val) => val !== undefined && val !== null);

    if (sampleValues.length === 0) return "text";

    // Check if all sample values are numbers
    const numericValues = sampleValues.filter(
      (val) =>
        typeof val === "number" ||
        (typeof val === "string" && !isNaN(val.replace(/[$,%]/g, "")))
    );

    if (numericValues.length === sampleValues.length) return "numeric";

    // Check if all sample values look like dates
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const dateValues = sampleValues.filter(
      (val) => typeof val === "string" && datePattern.test(val)
    );

    if (dateValues.length === sampleValues.length) return "date";

    return "text";
  });

  return {
    data: formattedData,
    headers: headers,
    headerTypes: headerTypes,
  };
}

/**
 * Get available aggregation functions for a data type
 * @param {string} dataType - The data type (numeric, date, text)
 * @returns {Array} - Array of available aggregation functions
 */
export function getAvailableAggregations(dataType) {
  // All types support count
  const aggregations = [{ value: "count", label: "Count" }];

  if (dataType === "numeric") {
    // Numeric fields support these aggregations
    return [
      ...aggregations,
      { value: "sum", label: "Sum" },
      { value: "avg", label: "Average" },
      { value: "min", label: "Minimum" },
      { value: "max", label: "Maximum" },
    ];
  } else if (dataType === "date") {
    // Date fields support these aggregations
    return [
      ...aggregations,
      { value: "min", label: "Earliest" },
      { value: "max", label: "Latest" },
    ];
  }

  // Text fields only support count and distinct count
  return [...aggregations, { value: "distinct", label: "Distinct Count" }];
}
