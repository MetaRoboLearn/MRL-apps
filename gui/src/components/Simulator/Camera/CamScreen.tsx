import { useEffect, useRef, useState } from "react";
import { useTaskConfig } from "../../../hooks/useTaskConfig.ts";
import { connectRobotCameraSocket, safeCloseWs } from "../../../api/brokerApi.ts";

type WsStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

const RECONNECT_DELAY_MS = 3000;

const CamScreen = () => {
  const { selectedRobotId } = useTaskConfig();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const sessionRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const teardownWs = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        safeCloseWs(wsRef.current);
        wsRef.current = null;
      }
    };

    const cleanup = () => {
      sessionRef.current++;
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      teardownWs();
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };

    cleanup();
    setImageSrc(null);
    setWsStatus("idle");

    if (!selectedRobotId) return cleanup;

    const session = sessionRef.current;

    const connect = () => {
      if (sessionRef.current !== session) return;
      teardownWs();
      wsRef.current = connectRobotCameraSocket(
        selectedRobotId,
        (blob) => {
          if (sessionRef.current !== session) return;
          const url = URL.createObjectURL(blob);
          if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
          currentUrlRef.current = url;
          setImageSrc(url);
        },
        (status) => {
          if (sessionRef.current !== session) return;
          setWsStatus(status);
          if (status === "disconnected" || status === "error") {
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              connect();
            }, RECONNECT_DELAY_MS);
          }
        },
      );
    };

    connect();

    return cleanup;
  }, [selectedRobotId]);

  const statusLabel =
    !selectedRobotId ? "Onemogućeno" :
    wsStatus === "connected" ? "Spojeno" :
    wsStatus === "connecting" ? "Spajanje…" :
    wsStatus === "error" ? "Greška" :
    "Čekanje";

  const statusClass =
    !selectedRobotId ? "bg-gray-200 text-gray-500" :
    wsStatus === "connected" ? "bg-green-100 text-green-700" :
    wsStatus === "connecting" ? "bg-yellow-100 text-yellow-700 animate-pulse" :
    wsStatus === "error" ? "bg-red-100 text-red-700" :
    "bg-gray-200 text-gray-500";

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full border-t-8 border-y-10 border-indigo-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Kamera</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <button
          onClick={() => setImageSrc(null)}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          Obriši
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 min-h-0 bg-gray-900 flex items-center justify-center overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Live camera feed"
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-gray-500 text-sm font-mono">
            {!selectedRobotId
              ? "Odaberite robota za prikaz kamere"
              : "Čekanje na slike…"}
          </span>
        )}
      </div>
    </div>
  );
};

export default CamScreen;
