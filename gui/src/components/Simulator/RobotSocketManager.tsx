import { useEffect, useRef } from "react";
import { useTaskConfig } from "../../hooks/useTaskConfig.ts";
import { useConsole } from "../../hooks/useConsole.ts";
import {
  connectRobotPrintSocket,
  connectRobotLogSocket,
  safeCloseWs,
} from "../../api/brokerApi.ts";

const RECONNECT_DELAY_MS = 3000;

const teardownWs = (ws: WebSocket | null): void => {
  if (!ws) return;
  ws.onclose = null;
  ws.onerror = null;
  ws.onopen = null;
  ws.onmessage = null;
  safeCloseWs(ws);
};

const RobotSocketManager = () => {
  const { selectedRobotId } = useTaskConfig();
  const { addLog } = useConsole();
  // Keep addLog in a ref so it never needs to be a useEffect dependency,
  // preventing spurious reconnects when the callback identity changes.
  const addLogRef = useRef(addLog);
  addLogRef.current = addLog;

  const printWsRef = useRef<WebSocket | null>(null);
  const logWsRef = useRef<WebSocket | null>(null);
  const printRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Incremented each time we tear down sockets. Callbacks check this value against the session they were created in, so any in-flight message from a closing socket is silently dropped instead of writing to the new session.
  const sessionRef = useRef(0);

  useEffect(() => {
    const cleanup = () => {
      sessionRef.current++;
      if (printRetryRef.current !== null) {
        clearTimeout(printRetryRef.current);
        printRetryRef.current = null;
      }
      if (logRetryRef.current !== null) {
        clearTimeout(logRetryRef.current);
        logRetryRef.current = null;
      }
      teardownWs(printWsRef.current);
      printWsRef.current = null;
      teardownWs(logWsRef.current);
      logWsRef.current = null;
    };

    cleanup();

    if (!selectedRobotId) return cleanup;

    const session = sessionRef.current;

    const connectPrint = () => {
      if (sessionRef.current !== session) return;
      teardownWs(printWsRef.current);
      printWsRef.current = connectRobotPrintSocket(
        selectedRobotId,
        (msg) => {
          if (sessionRef.current !== session) return;
          addLogRef.current("OUTPUT", msg.Text);
        },
        (status) => {
          if (sessionRef.current !== session) return;
          if (status === "disconnected" || status === "error") {
            printRetryRef.current = setTimeout(() => {
              printRetryRef.current = null;
              connectPrint();
            }, RECONNECT_DELAY_MS);
          }
        },
      );
    };

    const connectLog = () => {
      if (sessionRef.current !== session) return;
      teardownWs(logWsRef.current);
      logWsRef.current = connectRobotLogSocket(
        selectedRobotId,
        (log) => {
          if (sessionRef.current !== session) return;
          if (log.LogLevel === "ERROR") {
            addLogRef.current("ERROR", log.Message);
          }
        },
        (status) => {
          if (sessionRef.current !== session) return;
          if (status === "disconnected" || status === "error") {
            logRetryRef.current = setTimeout(() => {
              logRetryRef.current = null;
              connectLog();
            }, RECONNECT_DELAY_MS);
          }
        },
      );
    };

    connectPrint();
    connectLog();

    return cleanup;
  }, [selectedRobotId]);

  return null;
};

export default RobotSocketManager;
