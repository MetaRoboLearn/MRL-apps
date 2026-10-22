import {useContext} from "react";
import {CodeContext} from "../providers/Context.tsx";

export const useCode = () => {
  const context = useContext(CodeContext);

  if (!context) {
    throw new Error('useCode must be used within a CodeProvider');
  }

  return context;
}