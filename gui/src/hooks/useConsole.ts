import {useContext} from "react";
import {ConsoleContext} from "../providers/Context.tsx";

export const useConsole = () => {
  const ctx = useContext(ConsoleContext);
  if (!ctx) throw new Error("useConsole must be inside ConsoleProvider");
  return ctx;
};