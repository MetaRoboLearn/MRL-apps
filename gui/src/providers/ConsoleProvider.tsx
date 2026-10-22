import {PropsWithChildren, useCallback, useState} from "react";
import {LogEntry} from "../types/consoleTypes.ts";
import { ConsoleContext } from "./Context.tsx";

export const ConsoleProvider = ({ children }: PropsWithChildren) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev, { level, message, timestamp: new Date() }]);
  }, []);

  // addLog("INFO", "Simulacija pokrenuta");
  // addLog("ERROR", "SyntaxError: unexpected indent");
  // addLog("OUTPUT", "naprijed");

  const clearLogs = useCallback(() => setLogs([]), []);

  return (
    <ConsoleContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </ConsoleContext.Provider>
  );
};