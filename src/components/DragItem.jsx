import React from "react";
import { useDrag } from "react-dnd";

function DragItem({ header, type, moveItem }) {
  const [{ isDragging }, drag] = useDrag({
    type: "field",
    item: { header, sourceType: type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  // Colors based on the type
  const getColors = () => {
    switch (type) {
      case "row":
        return "border-blue-400 bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "column":
        return "border-green-400 bg-green-100 text-green-800 hover:bg-green-200";
      case "valueField":
        return "border-purple-400 bg-purple-100 text-purple-800 hover:bg-purple-200";
      default:
        return "border-gray-400 bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };

  const handleDoubleClick = () => {
    if (type === "field") {
      moveItem(header, "row");
    }
  };

  return (
    <div
      ref={drag}
      className={`p-2 border rounded cursor-move transition-all
      ${isDragging ? "opacity-50 scale-105" : "opacity-100"}
      ${getColors()}`}
      onDoubleClick={handleDoubleClick}
      title={`Drag to use '${header}' as a dimension or double-click to add to rows`}
    >
      {header}
    </div>
  );
}

export default DragItem;
