import html2canvas from "html2canvas";

export const exportToExcel = () => {
  if (!pivotData?.pivotTables) return toast.warn("No pivot data to export");

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

export const exportPNG = async ({ divRef }) => {
  if (!divRef.current) return;

  // Get the full scrollable size
  const node = divRef.current;
  const originalOverflow = node.style.overflow;
  node.style.overflow = "visible"; // Ensure all content is visible

  // Optionally, scroll to top to avoid scrollbars in the image
  node.scrollTop = 0;
  node.scrollLeft = 0;

  // Use html2canvas with full width/height
  await html2canvas(node, {
    useCORS: true,
    backgroundColor: "#fff",
    width: node.scrollWidth,
    height: node.scrollHeight,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
  }).then((canvas) => {
    const link = document.createElement("a");
    link.download = "pivot-table.png";
    link.href = canvas.toDataURL();
    link.click();
  });

  node.style.overflow = originalOverflow; // Restore original style
};
