import React from "react";
import { useDrop } from "react-dnd";

function DropZone({ type, children, onDrop }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "field", // Changed from "FIELD" to "field" to match DragItem
    drop: (item) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`${isOver && canDrop ? "ring-2 ring-blue-500" : ""}`}
    >
      {children}
    </div>
  );
}

export default DropZone;
