// hooks/useUndoRedoHistory.js
import { useState, useCallback, useRef } from "react";

export function useUndoRedoHistory(initialState) {
  const [present, setPresent] = useState(initialState);
  const pastRef = useRef([]);
  const futureRef = useRef([]);

  const pushSnapshot = useCallback(
    (snapshot) => {
      pastRef.current.push(JSON.parse(JSON.stringify(snapshot)));
      futureRef.current = [];
    },
    []
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    const prev = pastRef.current.pop();
    futureRef.current.push(JSON.parse(JSON.stringify(present)));
    setPresent(prev);
  }, [present]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const next = futureRef.current.pop();
    pastRef.current.push(JSON.parse(JSON.stringify(present)));
    setPresent(next);
  }, [present]);

  const reset = useCallback((state) => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(state);
  }, []);

  return {
    present,
    setPresent,
    pushSnapshot,
    undo,
    redo,
    reset,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
