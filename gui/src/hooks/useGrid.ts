import {GridContext} from "../providers/Context.tsx";
import {useContext} from "react";

export const useGrid = () => {
  const context = useContext(GridContext);

  if (!context) {
    throw new Error('useGrid must be used within a GridProvider');
  }

  return context;
}