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

  // Visual feedback styles for when dragging over - using teal and sand theme
  const getBorderStyles = () => {
    if (!isOver || !canDrop) return "";
    
    const styleMap = {
      row: "ring-4 ring-teal-300 shadow-lg",
      column: "ring-4 ring-teal-400 shadow-lg",
      valueField: "ring-4 ring-sand-300 shadow-lg"
    };
    return styleMap[type] || styleMap.valueField;
  };

  return (
    <div ref={drop} className={`transition-all duration-200 rounded-lg ${getBorderStyles()}`}>
      {children}
    </div>
  );
}

export default DropZone;