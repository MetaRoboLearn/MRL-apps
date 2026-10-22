import {useContext} from "react";
import {UIContext} from "../providers/Context.tsx";

export const useUI = () => {
  const context = useContext(UIContext);

  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }

  return context;
};