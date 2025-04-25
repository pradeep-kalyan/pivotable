import React from "react";
import { useDrop } from "react-dnd";

function DropZone({ type, children, onDrop }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "field",
    drop: (item) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  // Visual feedback styles for when dragging over
  const getBorderStyles = () => {
    if (isOver && canDrop) {
      switch (type) {
        case "row":
          return "ring-4 ring-blue-300 shadow-lg";
        case "column":
          return "ring-4 ring-green-300 shadow-lg";
        default:
          return "ring-4 ring-purple-300 shadow-lg";
      }
    }
    return "";
  };

  return (
    <div
      ref={drop}
      className={`transition-all duration-200 rounded-lg ${getBorderStyles()}`}
    >
      {children}
    </div>
  );
}

export default DropZone;
