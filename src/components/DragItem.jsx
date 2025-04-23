import React from "react";
import { useDrag } from "react-dnd";

function DragItem({ header, type, moveItem }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "field", // Keep consistent with what DropZone is accepting
    item: { header, sourceType: type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const didDrop = monitor.didDrop();
      if (!didDrop) {
        // Optionally handle unsuccessful drops
        console.log("Item was not dropped on a valid target");
      }
    },
  }));

  // Colors based on the type
  const getColors = () => {
    switch (type) {
      case "row":
        return "border-blue-400 bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "column":
        return "border-green-400 bg-green-100 text-green-800 hover:bg-green-200";
      default:
        return "border-gray-400 bg-white text-gray-700 hover:bg-gray-100";
    }
  };

  // Handle item click for non-drag operations
  const handleClick = () => {
    if (type === "field") {
      moveItem(header, "row"); // Default to row when clicked
    }
  };

  return (
    <div
      ref={drag}
      className={`p-2 border rounded cursor-move ${getColors()} ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      onClick={handleClick}
      title={`${
        type === "field" ? "Drag" : "Drag or click"
      } to add '${header}' as a ${type === "field" ? "dimension" : type}`}
    >
      {header}
    </div>
  );
}

export default DragItem;
