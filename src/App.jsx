import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DragItem from "./components/DragItem";
import DropZone from "./components/DropZone";
import * as XLSX from "xlsx";
import { generatePivotTable } from "./utils/GeneratePivot";
import PivotTableNew from "./components/PivotTableNew";

import {
  Upload,
  ChevronDown,
  ChevronUp,
  Settings,
  Download,
  X,
  Plus,
  Loader2,
} from "lucide-react";

function App() {
  // State management
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [headerTypes, setHeaderTypes] = useState({});
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [valueFields, setValueFields] = useState([]);
  const [pivotData, setPivotData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedField, setSelectedField] = useState("");
  const [selectedAggregation, setSelectedAggregation] = useState("sum");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [openSection, setOpenSection] = useState("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sampleData, setSampleData] = useState(null);

  // Toggle section visibility
  const toggleSection = (section) => {
    setOpenSection(openSection === section ? "all" : section);
  };

  // Process Excel file into usable data
  const processExcelData = (buffer) => {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      raw: false,
    });

    if (jsonData.length < 2) {
      throw new Error("File has insufficient data");
    }

    // Extract headers and data
    const headers = jsonData[0].map((h) => String(h || "").trim());

    // Determine data types for each column
    const headerTypes = {};
    for (let i = 0; i < headers.length; i++) {
      if (!headers[i]) continue;

      const columnValues = jsonData.slice(1).map((row) => row[i]);
      const nonEmptyValues = columnValues.filter(
        (v) => v !== undefined && v !== null && v !== ""
      );

      if (nonEmptyValues.length === 0) {
        headerTypes[headers[i]] = "string";
      } else {
        const numericCount = nonEmptyValues.filter(
          (v) => !isNaN(parseFloat(v))
        ).length;
        headerTypes[headers[i]] =
          numericCount / nonEmptyValues.length > 0.7 ? "numeric" : "string";
      }
    }

    // Create a sample of the data for preview
    const sampleRows = jsonData.slice(1, Math.min(6, jsonData.length));

    return {
      headers,
      headerTypes,
      data: jsonData,
      sample: [headers, ...sampleRows],
    };
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLoadData(file);
    }
  };

  // Process uploaded file
  const handleLoadData = (file) => {
    if (!file) return toast.error("Please upload a file first.");
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = processExcelData(event.target.result);
        if (!result || result.data.length === 0) {
          setIsLoading(false);
          return toast.error("No data found in the file");
        }

        // Set state with the processed data
        setData(result.data);
        setHeaders(result.headers);
        setHeaderTypes(result.headerTypes);
        setSampleData(result.sample);
        setIsDataLoaded(true);
        setRows([]);
        setColumns([]);
        setValueFields([]);
        setPivotData(null);

        toast.success(
          `Loaded ${result.data.length - 1} rows from "${file.name}"`
        );
        setIsLoading(false);
      } catch (error) {
        console.error("Error processing file:", error);
        toast.error(`Error: ${error.message || "Failed to process file"}`);
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read the file");
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle drag and drop operations
  const handleDrop = (item, targetType) => {
    const { header, sourceType } = item;

    // If source and target are the same, do nothing
    if (sourceType === targetType) return;

    // If coming from another area, remove from that area first
    if (sourceType === "row") {
      setRows(rows.filter((r) => r !== header));
    } else if (sourceType === "column") {
      setColumns(columns.filter((c) => c !== header));
    } else if (sourceType === "valueField") {
      setValueFields(valueFields.filter((v) => v.field !== header));
    }

    // Add to the target area
    if (targetType === "row" && !rows.includes(header)) {
      setRows([...rows, header]);
    } else if (targetType === "column" && !columns.includes(header)) {
      setColumns([...columns, header]);
    } else if (targetType === "valueField") {
      const defaultAgg = headerTypes[header] === "numeric" ? "sum" : "count";
      if (!valueFields.some((v) => v.field === header)) {
        setValueFields([
          ...valueFields,
          { field: header, aggregation: defaultAgg },
        ]);
      }
    }
  };

  // Remove item from a zone
  const removeItem = (type, item) => {
    if (type === "row") {
      setRows(rows.filter((r) => r !== item));
    } else if (type === "column") {
      setColumns(columns.filter((c) => c !== item));
    } else if (type === "valueField") {
      setValueFields(valueFields.filter((v) => v.field !== item.field));
    }
  };

  // Update aggregation type for a value field
  const updateAggregation = (field, aggregation) => {
    setValueFields(
      valueFields.map((v) => {
        if (v.field === field) {
          return { ...v, aggregation };
        }
        return v;
      })
    );
  };

  // Add selected field with aggregation
  const addValueField = () => {
    if (!selectedField) {
      toast.warn("Please select a field first");
      return;
    }

    // Check if this exact field and aggregation combination already exists
    if (
      valueFields.some(
        (v) =>
          v.field === selectedField && v.aggregation === selectedAggregation
      )
    ) {
      toast.info(`${selectedAggregation} of ${selectedField} is already added`);
      return;
    }

    setValueFields([
      ...valueFields,
      {
        field: selectedField,
        aggregation: selectedAggregation,
      },
    ]);

    toast.success(`Added ${selectedAggregation} of ${selectedField}`);
  };

  // Generate the pivot table
  const generatePivotData = () => {
    if (data.length <= 1) {
      toast.error("No data available to pivot");
      return;
    }

    if (valueFields.length === 0) {
      toast.warn("Please add at least one value field");
      return;
    }

    setIsAnalyzing(true);

    // Use setTimeout to allow the UI to update first
    setTimeout(() => {
      try {
        const result = generatePivotTable(
          data,
          headers,
          rows,
          columns,
          valueFields
        );
        setPivotData(result);
        setIsAnalyzing(false);

        // Scroll to results
        const resultsElement = document.getElementById("pivot-results");
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: "smooth" });
        }
      } catch (error) {
        console.error("Error generating pivot table:", error);
        toast.error(`Failed to generate pivot table: ${error.message}`);
        setIsAnalyzing(false);
      }
    }, 100);
  };

  // Get available aggregation functions based on field type
  const getAvailableAggregations = (fieldName) => {
    if (!fieldName || !headerTypes[fieldName]) return ["count"];

    const fieldType = headerTypes[fieldName];

    if (fieldType === "numeric") {
      return ["sum", "avg", "count", "min", "max"];
    } else {
      return ["count", "distinct"];
    }
  };

  // Load demo data
  const loadDemoData = () => {
    setIsLoading(true);

    // Sample sales data
    const demoHeaders = [
      "Date",
      "Region",
      "Product",
      "Category",
      "Sales",
      "Quantity",
      "Discount",
    ];
    const demoData = [
      demoHeaders,
      ["2024-01-01", "North", "Widget A", "Electronics", 1200, 5, 0.1],
      ["2024-01-05", "North", "Widget B", "Electronics", 950, 3, 0.05],
      ["2024-01-10", "South", "Widget A", "Electronics", 1500, 6, 0],
      ["2024-01-12", "East", "Gadget C", "Home", 750, 2, 0.2],
      ["2024-01-15", "West", "Widget B", "Electronics", 1100, 4, 0.1],
      ["2024-01-18", "North", "Gadget C", "Home", 850, 3, 0.15],
      ["2024-01-20", "South", "Item D", "Office", 500, 8, 0],
      ["2024-01-22", "East", "Widget A", "Electronics", 1350, 5, 0],
      ["2024-01-25", "West", "Item D", "Office", 480, 7, 0.05],
      ["2024-01-28", "North", "Gadget C", "Home", 900, 3, 0],
      ["2024-02-01", "South", "Widget B", "Electronics", 1050, 4, 0.1],
      ["2024-02-05", "East", "Widget A", "Electronics", 1250, 5, 0.05],
      ["2024-02-10", "West", "Item D", "Office", 520, 8, 0.15],
      ["2024-02-12", "North", "Widget B", "Electronics", 980, 3, 0],
      ["2024-02-15", "South", "Gadget C", "Home", 800, 3, 0.1],
    ];

    // Create header types
    const demoHeaderTypes = {
      Date: "date",
      Region: "string",
      Product: "string",
      Category: "string",
      Sales: "numeric",
      Quantity: "numeric",
      Discount: "numeric",
    };

    // Set state with demo data
    setData(demoData);
    setHeaders(demoHeaders);
    setHeaderTypes(demoHeaderTypes);
    setSampleData(demoData.slice(0, 6));
    setIsDataLoaded(true);
    setRows([]);
    setColumns([]);
    setValueFields([]);
    setPivotData(null);

    toast.success("Demo data loaded successfully");
    setIsLoading(false);
  };

  // Export data to Excel
  const exportToExcel = () => {
    if (!pivotData || !pivotData.pivotTables) {
      toast.warn("No pivot data to export");
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // Add each pivot table as a separate sheet
      Object.entries(pivotData.pivotTables).forEach(([key, tableData]) => {
        const { field, aggregation, table } = tableData;
        const sheetName = `${field}_${aggregation}`.slice(0, 31); // Excel sheet names are limited to 31 chars

        const worksheet = XLSX.utils.aoa_to_sheet(table);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Write the workbook and trigger download
      XLSX.writeFile(workbook, "pivot_analysis.xlsx");
      toast.success("Exported pivot data to Excel");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error(`Failed to export: ${error.message}`);
    }
  };

  // Render UI
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50">
        <ToastContainer position="top-right" />

        {/* Header */}
        <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold flex items-center">
              <Settings className="mr-2" />
              Dynamic Pivot Table Generator
            </h1>
            <p className="mt-2 opacity-90">
              Analyze and visualize your data with interactive pivot tables
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Data Import Section */}
          <section className="mb-8 bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <Upload className="mr-2 text-blue-600" size={20} />
                Data Import
              </h2>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isLoading}
                />
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                  transition-colors flex items-center shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                  ) : (
                    <Upload className="mr-2" size={18} />
                  )}
                  Upload Excel/CSV
                </button>
              </div>

              <div className="h-8 border-r border-gray-300 mx-2"></div>

              <button
                onClick={loadDemoData}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg 
                transition-colors shadow-md flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" size={18} />
                ) : (
                  <Plus className="mr-2" size={18} />
                )}
                Load Demo Data
              </button>
            </div>

            {/* Data preview */}
            {sampleData && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-2">
                  Data Preview:
                </h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        {sampleData[0].map((header, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                            {headerTypes[header] === "numeric" && (
                              <span className="ml-1 text-blue-500 font-normal">
                                (#)
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sampleData.slice(1).map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={
                            rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap"
                            >
                              {cell !== undefined && cell !== null
                                ? String(cell)
                                : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Showing first {sampleData.length - 1} of {data.length - 1}{" "}
                  rows
                </p>
              </div>
            )}
          </section>

          {isDataLoaded && (
            <>
              {/* Field Configuration Section */}
              <section className="mb-8 bg-white rounded-xl shadow-md p-6">
                <div
                  className="flex justify-between items-center mb-6 cursor-pointer"
                  onClick={() => toggleSection("fields")}
                >
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Configure Pivot Fields
                  </h2>
                  {openSection === "fields" ? (
                    <ChevronUp className="text-gray-600" />
                  ) : (
                    <ChevronDown className="text-gray-600" />
                  )}
                </div>

                {(openSection === "fields" || openSection === "all") && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Available fields */}
                    <div className="lg:col-span-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="font-medium text-gray-700 mb-3">
                          Available Fields
                        </h3>
                        <div className="h-64 overflow-y-auto p-2 grid grid-cols-2 gap-2">
                          {headers
                            .filter((h) => h)
                            .map((header) => (
                              <DragItem
                                key={header}
                                header={header}
                                type="field"
                                moveItem={(h, t) =>
                                  handleDrop(
                                    { header: h, sourceType: "field" },
                                    t
                                  )
                                }
                              />
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Drag fields to Rows/Columns or double-click to add to
                          Rows
                        </p>
                      </div>
                    </div>

                    {/* Drop zones */}
                    <div className="lg:col-span-8 grid grid-cols-1 gap-4">
                      {/* Rows */}
                      <DropZone
                        type="row"
                        onDrop={(item) => handleDrop(item, "row")}
                      >
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h3 className="font-medium text-blue-700 mb-3 flex items-center">
                            <span className="inline-block w-3 h-3 rounded-sm bg-blue-700 mr-2"></span>
                            Row Dimensions
                          </h3>
                          {rows.length === 0 ? (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-blue-200 rounded-lg">
                              <p className="text-blue-400">
                                Drop fields here for row dimensions
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {rows.map((row) => (
                                <div
                                  key={row}
                                  className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded border border-blue-300"
                                >
                                  {row}
                                  <button
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                    onClick={() => removeItem("row", row)}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </DropZone>

                      {/* Columns */}
                      <DropZone
                        type="column"
                        onDrop={(item) => handleDrop(item, "column")}
                      >
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h3 className="font-medium text-green-700 mb-3 flex items-center">
                            <span className="inline-block w-3 h-3 rounded-sm bg-green-700 mr-2"></span>
                            Column Dimensions
                          </h3>
                          {columns.length === 0 ? (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-green-200 rounded-lg">
                              <p className="text-green-400">
                                Drop fields here for column dimensions
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {columns.map((column) => (
                                <div
                                  key={column}
                                  className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded border border-green-300"
                                >
                                  {column}
                                  <button
                                    className="ml-2 text-green-600 hover:text-green-800"
                                    onClick={() => removeItem("column", column)}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </DropZone>

                      {/* Value Fields */}
                      <DropZone
                        type="valueField"
                        onDrop={(item) => handleDrop(item, "valueField")}
                      >
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <h3 className="font-medium text-purple-700 mb-3 flex items-center">
                            <span className="inline-block w-3 h-3 rounded-sm bg-purple-700 mr-2"></span>
                            Value Fields
                          </h3>

                          {valueFields.length === 0 ? (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-purple-200 rounded-lg">
                              <p className="text-purple-400">
                                Drop fields here or add with controls below
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {/* Group value fields by field name */}
                              {Object.entries(
                                valueFields.reduce((acc, vf) => {
                                  if (!acc[vf.field]) acc[vf.field] = [];
                                  acc[vf.field].push(vf);
                                  return acc;
                                }, {})
                              ).map(([field, fieldValues]) => (
                                <div
                                  key={field}
                                  className="flex flex-col bg-purple-50 p-2 rounded-lg border border-purple-200"
                                >
                                  <div className="text-sm font-medium text-purple-800 mb-1 px-1">
                                    {field}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {fieldValues.map((vf) => (
                                      <div
                                        key={`${vf.field}-${vf.aggregation}`}
                                        className="flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded border border-purple-300 text-sm"
                                      >
                                        <span className="font-medium">
                                          {vf.aggregation}
                                        </span>
                                        <button
                                          className="ml-2 text-purple-600 hover:text-purple-800"
                                          onClick={() =>
                                            removeItem("valueField", vf)
                                          }
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add value field controls */}
                          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="text-sm font-semibold text-purple-800 mb-2">
                              Add Value Field
                            </h4>
                            <div className="flex flex-wrap gap-3 items-end">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Field:
                                </label>
                                <select
                                  value={selectedField}
                                  onChange={(e) =>
                                    setSelectedField(e.target.value)
                                  }
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                  <option value="">Select field...</option>
                                  {headers
                                    .filter((h) => h)
                                    .map((header) => (
                                      <option key={header} value={header}>
                                        {header}{" "}
                                        {headerTypes[header] === "numeric"
                                          ? "(#)"
                                          : ""}
                                      </option>
                                    ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Aggregation:
                                </label>
                                <select
                                  value={selectedAggregation}
                                  onChange={(e) =>
                                    setSelectedAggregation(e.target.value)
                                  }
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                  disabled={!selectedField}
                                >
                                  {selectedField &&
                                    getAvailableAggregations(selectedField).map(
                                      (agg) => (
                                        <option key={agg} value={agg}>
                                          {agg.charAt(0).toUpperCase() +
                                            agg.slice(1)}
                                        </option>
                                      )
                                    )}
                                </select>
                              </div>

                              <button
                                onClick={addValueField}
                                disabled={!selectedField}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white 
                                rounded-md transition-colors flex items-center"
                              >
                                <Plus size={18} className="mr-1" />
                                Add
                              </button>
                            </div>
                            <p className="text-xs text-purple-700 mt-2">
                              <span className="font-medium">Tip:</span> You can
                              add multiple aggregations (sum, avg, count, etc.)
                              for the same field
                            </p>
                          </div>
                        </div>
                      </DropZone>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={generatePivotData}
                    disabled={isAnalyzing || valueFields.length === 0}
                    className={`px-6 py-3 text-lg rounded-lg shadow-md transition-all
                    ${
                      isAnalyzing
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:transform active:scale-95"
                    } 
                    text-white font-medium flex items-center`}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>Generate Pivot Tables</>
                    )}
                  </button>
                </div>
              </section>

              {/* Results section */}
              {pivotData && (
                <section
                  id="pivot-results"
                  className="mb-8 bg-white rounded-xl shadow-lg p-6"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      Pivot Analysis Results
                    </h2>

                    <button
                      onClick={exportToExcel}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white 
                      rounded-lg transition-colors flex items-center shadow-sm"
                    >
                      <Download size={18} className="mr-2" />
                      Export to Excel
                    </button>
                  </div>

                  <PivotTableNew
                    pivotData={pivotData}
                    rows={rows}
                    columns={columns}
                    valueFields={valueFields}
                  />
                </section>
              )}
            </>
          )}
        </main>

        <footer className="bg-gray-100 border-t border-gray-200 py-6">
          <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
            <p>
              Dynamic Pivot Table Generator &copy; {new Date().getFullYear()}
            </p>
            <p className="mt-1">
              Create interactive pivot tables from your data
            </p>
          </div>
        </footer>
      </div>
    </DndProvider>
  );
}

export default App;
