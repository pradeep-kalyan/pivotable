import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DragItem from "./components/DragItem";
import DropZone from "./components/DropZone";
import * as XLSX from "xlsx";
import { generatePivotTable } from "./utils/GeneratePivot";
import {
  Upload,
  ChevronDown,
  ChevronUp,
  Download,
  X,
  Plus,
  Loader2,
  Images,
} from "lucide-react";
import PivotTable from "./components/PivotTable";
import { exportToExcel, exportPNG } from "./utils/exports";
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

  const divRef = React.useRef(null);

  // Toggle section visibility
  const toggleSection = (section) =>
    setOpenSection(openSection === section ? "all" : section);

  // Process Excel file into usable data
  const processExcelData = (buffer) => {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      raw: false,
    });

    if (jsonData.length < 2) throw new Error("File has insufficient data");

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
    if (file) handleLoadData(file);
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
      valueFields.map((v) => (v.field === field ? { ...v, aggregation } : v))
    );
  };

  // Add selected field with aggregation
  const addValueField = () => {
    if (!selectedField) {
      return toast.warn("Please select a field first");
    }

    // Check if this exact field and aggregation combination already exists
    if (
      valueFields.some(
        (v) =>
          v.field === selectedField && v.aggregation === selectedAggregation
      )
    ) {
      return toast.info(
        `${selectedAggregation} of ${selectedField} is already added`
      );
    }

    setValueFields([
      ...valueFields,
      { field: selectedField, aggregation: selectedAggregation },
    ]);
    toast.success(`Added ${selectedAggregation} of ${selectedField}`);
  };

  // Generate the pivot table
  const generatePivotData = () => {
    if (data.length <= 1) return toast.error("No data available to pivot");
    if (valueFields.length === 0)
      return toast.warn("Please add at least one value field");

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
        if (resultsElement)
          resultsElement.scrollIntoView({ behavior: "smooth" });
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
    return headerTypes[fieldName] === "numeric"
      ? ["sum", "avg", "count", "min", "max"]
      : ["count", "distinct"];
  };

  // Render UI
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-sand-50 flex justify-center">
        <ToastContainer position="top-right" />

        <main className="container max-w-5xl mx-auto px-4 py-8 font-lato">
          {/* Data Import Section */}
          <section className="mb-8 card p-6">
            <div className="flex justify-center items-center mb-6">
              <h2 className="text-2xl font-bold text-teal-700 flex items-center font-audio">
                <Upload className="mr-2 text-teal-600" size={20} />
                Pivot Table Generator
              </h2>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-center">
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isLoading}
                />
                <button className="teal-button">
                  {isLoading ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                  ) : (
                    <Upload className="mr-2" size={18} />
                  )}
                  Upload Excel/CSV
                </button>
              </div>
            </div>

            {/* Data preview */}
            {sampleData && (
              <div className="mt-8">
                <h3 className="font-medium text-teal-700 mb-2 text-center">
                  Data Preview
                </h3>
                <div className="overflow-x-auto border border-sand-200 rounded-lg">
                  <table className="min-w-full divide-y divide-sand-200">
                    <thead className="bg-teal-100">
                      <tr>
                        {sampleData[0].map((header, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-3 text-left text-xs font-medium text-teal-800 uppercase tracking-wider"
                          >
                            {header}
                            {headerTypes[header] === "numeric" && (
                              <span className="ml-1 text-teal-600 font-normal">
                                (#)
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-sand-100">
                      {sampleData.slice(1).map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={
                            rowIdx % 2 === 0
                              ? "table-row-even"
                              : "table-row-odd"
                          }
                        >
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-4 py-2 text-sm text-sand-800 whitespace-nowrap"
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
                <p className="text-xs text-teal-600 mt-2 text-center">
                  Showing first {sampleData.length - 1} of {data.length - 1}{" "}
                  rows
                </p>
              </div>
            )}
          </section>

          {isDataLoaded && (
            <>
              {/* Field Configuration Section */}
              <section className="mb-8 card p-6">
                <div
                  className="flex justify-between items-center mb-6 cursor-pointer"
                  onClick={() => toggleSection("fields")}
                >
                  <h2 className="text-2xl font-semibold text-teal-700 text-center w-full font-audio">
                    Configure Pivot Fields
                    {openSection === "fields" ? (
                      <ChevronUp className="inline-block ml-2 text-teal-600" />
                    ) : (
                      <ChevronDown className="inline-block ml-2 text-teal-600" />
                    )}
                  </h2>
                </div>

                {(openSection === "fields" || openSection === "all") && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Available fields */}
                    <div className="lg:col-span-4">
                      <div className="bg-sand-50 p-4 rounded-lg border border-sand-200">
                        <h3 className="font-medium text-teal-700 mb-3 text-center">
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
                        <p className="mt-2 text-xs text-teal-600 text-center">
                          Drag fields to Rows/Columns or double-click to add to
                          Rows
                        </p>
                      </div>
                    </div>

                    {/* Drop zones */}
                    <div className="lg:col-span-8 grid grid-cols-1 gap-4">
                      {/* Rows */}
                      <div className="bg-sand-50 p-4 rounded-lg border border-sand-200">
                        <h3 className="font-medium text-teal-700 mb-2">Rows</h3>
                        <DropZone
                          type="row"
                          onDrop={(item) => handleDrop(item, "row")}
                        >
                          <div className="min-h-[80px] p-2 bg-white rounded border border-sand-200">
                            <div className="flex flex-wrap gap-2">
                              {rows.map((row) => (
                                <div key={row} className="flex items-center">
                                  <DragItem
                                    header={row}
                                    type="row"
                                    moveItem={(h, t) =>
                                      handleDrop(
                                        { header: h, sourceType: "row" },
                                        t
                                      )
                                    }
                                  />
                                  <button
                                    onClick={() => removeItem("row", row)}
                                    className="ml-1 text-sand-500 hover:text-sand-700"
                                    title="Remove field"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              {rows.length === 0 && (
                                <p className="text-sm text-sand-400 italic">
                                  Drag fields here to group rows
                                </p>
                              )}
                            </div>
                          </div>
                        </DropZone>
                      </div>

                      {/* Columns */}
                      <div className="bg-sand-50 p-4 rounded-lg border border-sand-200">
                        <h3 className="font-medium text-teal-700 mb-2">
                          Columns
                        </h3>
                        <DropZone
                          type="column"
                          onDrop={(item) => handleDrop(item, "column")}
                        >
                          <div className="min-h-[80px] p-2 bg-white rounded border border-sand-200">
                            <div className="flex flex-wrap gap-2">
                              {columns.map((column) => (
                                <div key={column} className="flex items-center">
                                  <DragItem
                                    header={column}
                                    type="column"
                                    moveItem={(h, t) =>
                                      handleDrop(
                                        { header: h, sourceType: "column" },
                                        t
                                      )
                                    }
                                  />
                                  <button
                                    onClick={() => removeItem("column", column)}
                                    className="ml-1 text-sand-500 hover:text-sand-700"
                                    title="Remove field"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              {columns.length === 0 && (
                                <p className="text-sm text-sand-400 italic">
                                  Drag fields here to group columns
                                </p>
                              )}
                            </div>
                          </div>
                        </DropZone>
                      </div>

                      {/* Values */}
                      <div className="bg-sand-50 p-4 rounded-lg border border-sand-200">
                        <h3 className="font-medium text-teal-700 mb-2">
                          Values
                        </h3>
                        <DropZone
                          type="valueField"
                          onDrop={(item) => handleDrop(item, "valueField")}
                        >
                          <div className="min-h-[80px] p-2 bg-white rounded border border-sand-200">
                            <div className="flex flex-wrap gap-2">
                              {valueFields.map((vf) => (
                                <div
                                  key={`${vf.field}-${vf.aggregation}`}
                                  className="flex items-center"
                                >
                                  <DragItem
                                    header={`${vf.field} (${vf.aggregation})`}
                                    type="valueField"
                                    moveItem={(h, t) =>
                                      handleDrop(
                                        {
                                          header: vf.field,
                                          sourceType: "valueField",
                                        },
                                        t
                                      )
                                    }
                                  />
                                  <button
                                    onClick={() => removeItem("valueField", vf)}
                                    className="ml-1 text-sand-500 hover:text-sand-700"
                                    title="Remove field"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              {valueFields.length === 0 && (
                                <p className="text-sm text-sand-400 italic">
                                  Drag fields here to aggregate values
                                </p>
                              )}
                            </div>
                          </div>
                        </DropZone>

                        {/* Add value field manually */}
                        <div className="mt-4 flex flex-wrap gap-2 items-end">
                          <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-medium text-teal-700 mb-1">
                              Field
                            </label>
                            <select
                              value={selectedField}
                              onChange={(e) => setSelectedField(e.target.value)}
                              className="w-full rounded-md border border-sand-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="">Select a field</option>
                              {headers
                                .filter((h) => h)
                                .map((header) => (
                                  <option key={header} value={header}>
                                    {header}
                                    {headerTypes[header] === "numeric"
                                      ? " (#)"
                                      : ""}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-medium text-teal-700 mb-1">
                              Aggregation
                            </label>
                            <select
                              value={selectedAggregation}
                              onChange={(e) =>
                                setSelectedAggregation(e.target.value)
                              }
                              className="w-full rounded-md border border-sand-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              {getAvailableAggregations(selectedField).map(
                                (agg) => (
                                  <option key={agg} value={agg}>
                                    {agg.charAt(0).toUpperCase() + agg.slice(1)}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <button
                            onClick={addValueField}
                            className="sand-button"
                            disabled={!selectedField}
                          >
                            <Plus size={18} className="mr-1" />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate button */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={generatePivotData}
                    disabled={isAnalyzing || valueFields.length === 0}
                    className="teal-button px-6 py-2.5 text-lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={20} />
                        Generating...
                      </>
                    ) : (
                      <>Generate Pivot Tables</>
                    )}
                  </button>
                </div>
              </section>

              {/* Results Section */}
              {pivotData && (
                <section id="pivot-results" className="mb-8 card p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-teal-700 text-center w-full font-audio">
                      Pivot Analysis Results
                      <button
                        onClick={exportToExcel}
                        className="sand-button ml-4 inline-flex"
                      >
                        <Download size={18} className="mr-2" />
                        Export to Excel
                      </button>
                      <button
                        onClick={() => exportPNG({ divRef })}
                        className="sand-button ml-4 inline-flex"
                      >
                        <Images  size={18} className="mr-2" />
                        Export to PNG
                      </button>
                    </h2>
                  </div>

                  <PivotTable
                    pivotData={pivotData}
                    rows={rows}
                    columns={columns}
                    valueFields={valueFields}
                    divRef={divRef}
                  />
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </DndProvider>
  );
}

export default App;
