import React from "react";
import { useDrag } from "react-dnd";

function DragItem({ header, type, moveItem }) {
  const [{ isDragging }, drag] = useDrag({
    type: "field",
    item: { header, sourceType: type },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  });

  // Colors based on the type using teal and sand theme
  const getColors = () => {
    const colorMap = {
      row: "border-teal-400 bg-teal-100 text-teal-800 hover:bg-teal-200",
      column: "border-teal-500 bg-teal-50 text-teal-800 hover:bg-teal-100",
      valueField: "border-sand-400 bg-sand-100 text-sand-800 hover:bg-sand-200",
      field: "border-sand-300 bg-sand-50 text-sand-700 hover:bg-sand-100"
    };
    return colorMap[type] || colorMap.field;
  };

  return (
    <div
      ref={drag}
      className={`p-2 border rounded cursor-move transition-all
      ${isDragging ? "opacity-50 scale-105" : "opacity-100"}
      ${getColors()}`}
      onDoubleClick={() => type === "field" && moveItem(header, "row")}
      title={`Drag to use '${header}' as a dimension or double-click to add to rows`}
    >
      {header}
    </div>
  );
}

export default DragItem;