import { useState, useEffect, useRef } from "react";
import {
  testBrokerConnection,
  fetchRobots,
  sendCommand,
  connectRobotLogSocket,
  connectRobotPrintSocket,
  connectRobotCameraSocket,
  safeCloseWs,
  sendAbort,
  shutdownRobot,
} from "../api/brokerApi.ts";

interface Robot {
  RobotId: string;
  Name: string;
  IsActivated: boolean;
  ActivatedOnSSID: string | null;
}

type StepStatus = "idle" | "loading" | "ok" | "error";

const BrokerTestPage = () => {
  const [connStatus, setConnStatus] = useState<StepStatus>("idle");
  const [connResult, setConnResult] = useState("");

  const [robotsStatus, setRobotsStatus] = useState<StepStatus>("idle");
  const [robotsResult, setRobotsResult] = useState("");
  const [robots, setRobots] = useState<Robot[]>([]);

  const [selectedRobotId, setSelectedRobotId] = useState<string>("");
  const [codeText, setCodeText] = useState("print('Hello from webapp')");
  const [cmdStatus, setCmdStatus] = useState<StepStatus>("idle");
  const [cmdResult, setCmdResult] = useState("");

  const [abortStatus, setAbortStatus] = useState<StepStatus>("idle");
  const [abortResult, setAbortResult] = useState("");

  const [shuttingDownIds, setShuttingDownIds] = useState<Set<string>>(new Set());
  const [shutdownResults, setShutdownResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const [logEntries, setLogEntries] = useState<{ level: string; message: string; timestamp?: string }[]>([]);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const wsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsSessionRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [printEntries, setPrintEntries] = useState<{ text: string; timestamp?: string }[]>([]);
  const [printWsStatus, setPrintWsStatus] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const printWsRef = useRef<WebSocket | null>(null);
  const printRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const printSessionRef = useRef(0);
  const printEndRef = useRef<HTMLDivElement>(null);

  const [cameraFrameUrl, setCameraFrameUrl] = useState<string | null>(null);
  const [cameraWsStatus, setCameraWsStatus] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const cameraWsRef = useRef<WebSocket | null>(null);
  const cameraRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraSessionRef = useRef(0);
  const currentFrameUrlRef = useRef<string | null>(null);

  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const init = async () => {
      // 1. Test connection
      setConnStatus("loading");
      try {
        const res = await testBrokerConnection();
        setConnResult(JSON.stringify(res, null, 2));
        setConnStatus("ok");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setConnResult(`Error: ${msg}`);
        setConnStatus("error");
        return;
      }

      // 2. Fetch robots
      setRobotsStatus("loading");
      try {
        const res: Robot[] = await fetchRobots();
        setRobots(res);
        setRobotsResult(JSON.stringify(res, null, 2));
        setShutdownResults({});
       setRobotsStatus("ok");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setRobotsResult(`Error: ${msg}`);
        setRobotsStatus("error");
      }
    };

    init();
  }, []);

  const handleSendCommand = async () => {
    setCmdStatus("loading");
    try {
      const res = await sendCommand(selectedRobotId, codeText);
      setCmdResult(JSON.stringify(res, null, 2));
      setCmdStatus("ok");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setCmdResult(`Error: ${msg}`);
      setCmdStatus("error");
    }
  };

  const handleShutdown = async (robotId: string) => {
    setShuttingDownIds((prev) => new Set(prev).add(robotId));
    try {
      await shutdownRobot(robotId);
      setShutdownResults((prev) => ({ ...prev, [robotId]: { ok: true, message: "Shutdown sent" } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setShutdownResults((prev) => ({ ...prev, [robotId]: { ok: false, message: msg } }));
    } finally {
      setShuttingDownIds((prev) => {
        const next = new Set(prev);
        next.delete(robotId);
        return next;
      });
    }
  };


  const handleAbortCommand = async () => {
        setAbortStatus("loading");
    try {
      const res = await sendAbort(selectedRobotId);
      setAbortResult(JSON.stringify(res, null, 2));
      setAbortStatus("ok");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setAbortResult(`Error: ${msg}`);
      setAbortStatus("error");
    }
  };


  const RECONNECT_DELAY_MS = 3000;

  const teardownWs = (ws: WebSocket | null) => {
    if (!ws) return;
    ws.onclose = null;
    ws.onerror = null;
    ws.onopen = null;
    ws.onmessage = null;
    safeCloseWs(ws);
  };

  useEffect(() => {
    const cleanup = () => {
      wsSessionRef.current++;
      if (wsRetryRef.current !== null) { clearTimeout(wsRetryRef.current); wsRetryRef.current = null; }
      teardownWs(wsRef.current); wsRef.current = null;
      setLogEntries([]);
      setWsStatus("idle");
    };

    cleanup();
    if (!selectedRobotId) return cleanup;

    const session = wsSessionRef.current;
    const connect = () => {
      if (wsSessionRef.current !== session) return;
      teardownWs(wsRef.current);
      wsRef.current = connectRobotLogSocket(
        selectedRobotId,
        (log) => {
          if (wsSessionRef.current !== session) return;
          setLogEntries((prev) => [...prev, { level: log.LogLevel, message: log.Message, timestamp: log.Timestamp }]);
        },
        (status) => {
          if (wsSessionRef.current !== session) return;
          setWsStatus(status);
          if (status === "disconnected" || status === "error") {
            wsRetryRef.current = setTimeout(() => { wsRetryRef.current = null; connect(); }, RECONNECT_DELAY_MS);
          }
        },
      );
    };
    connect();
    return cleanup;
  }, [selectedRobotId]);

  useEffect(() => {
    const cleanup = () => {
      printSessionRef.current++;
      if (printRetryRef.current !== null) { clearTimeout(printRetryRef.current); printRetryRef.current = null; }
      teardownWs(printWsRef.current); printWsRef.current = null;
      setPrintEntries([]);
      setPrintWsStatus("idle");
    };

    cleanup();
    if (!selectedRobotId) return cleanup;

    const session = printSessionRef.current;
    const connect = () => {
      if (printSessionRef.current !== session) return;
      teardownWs(printWsRef.current);
      printWsRef.current = connectRobotPrintSocket(
        selectedRobotId,
        (msg) => {
          if (printSessionRef.current !== session) return;
          setPrintEntries((prev) => [...prev, { text: msg.Text, timestamp: msg.Timestamp }]);
        },
        (status) => {
          if (printSessionRef.current !== session) return;
          setPrintWsStatus(status);
          if (status === "disconnected" || status === "error") {
            printRetryRef.current = setTimeout(() => { printRetryRef.current = null; connect(); }, RECONNECT_DELAY_MS);
          }
        },
      );
    };
    connect();
    return cleanup;
  }, [selectedRobotId]);

  useEffect(() => {
    const cleanup = () => {
      cameraSessionRef.current++;
      if (cameraRetryRef.current !== null) { clearTimeout(cameraRetryRef.current); cameraRetryRef.current = null; }
      teardownWs(cameraWsRef.current); cameraWsRef.current = null;
      if (currentFrameUrlRef.current) { URL.revokeObjectURL(currentFrameUrlRef.current); currentFrameUrlRef.current = null; }
      setCameraFrameUrl(null);
      setCameraWsStatus("idle");
    };

    cleanup();
    if (!selectedRobotId) return cleanup;

    const session = cameraSessionRef.current;
    const connect = () => {
      if (cameraSessionRef.current !== session) return;
      teardownWs(cameraWsRef.current);
      cameraWsRef.current = connectRobotCameraSocket(
        selectedRobotId,
        (blob) => {
          if (cameraSessionRef.current !== session) return;
          const url = URL.createObjectURL(blob);
          if (currentFrameUrlRef.current) URL.revokeObjectURL(currentFrameUrlRef.current);
          currentFrameUrlRef.current = url;
          setCameraFrameUrl(url);
        },
        (status) => {
          if (cameraSessionRef.current !== session) return;
          setCameraWsStatus(status);
          if (status === "disconnected" || status === "error") {
            cameraRetryRef.current = setTimeout(() => { cameraRetryRef.current = null; connect(); }, RECONNECT_DELAY_MS);
          }
        },
      );
    };
    connect();
    return cleanup;
  }, [selectedRobotId]);

  const handleRefreshRobots = async () => {
    setRobotsStatus("loading");
    try {
      const res: Robot[] = await fetchRobots();
      setRobots(res);
      setRobotsResult(JSON.stringify(res, null, 2));
      setShutdownResults({});
      setRobotsStatus("ok");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setRobotsResult(`Error: ${msg}`);
      setRobotsStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900">Robot Management</h1>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-700">Broker Connection</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                connStatus === "ok" ? "bg-green-100 text-green-700" :
                connStatus === "loading" ? "bg-yellow-100 text-yellow-700 animate-pulse" :
                connStatus === "error" ? "bg-red-100 text-red-700" :
                "bg-gray-200 text-gray-500"
              }`}>
                {connStatus === "ok" ? "Connected" :
                 connStatus === "loading" ? "Connecting…" :
                 connStatus === "error" ? "Error" :
                 "Idle"}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Robot List and Control */}
          <div className="lg:col-span-1 space-y-6">
            {/* Robots List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Active Robots</h2>
                <button
                  onClick={handleRefreshRobots}
                  disabled={robotsStatus === "loading"}
                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {robotsStatus === "loading" ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              
              {robots.filter((r) => r.IsActivated).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 italic">No active robots found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {robots
                    .filter((r) => r.IsActivated)
                    .map((robot) => (
                      <div
                        key={robot.RobotId}
                        className={`border rounded-lg p-4 transition cursor-pointer ${
                          selectedRobotId === robot.RobotId
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedRobotId(robot.RobotId)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">{robot.Name}</p>
                            <p className="text-xs text-gray-500 truncate font-mono">{robot.RobotId}</p>
                            {robot.ActivatedOnSSID && (
                              <p className="text-xs text-gray-400 mt-1">SSID: {robot.ActivatedOnSSID}</p>
                            )}
                            {shutdownResults[robot.RobotId] && (
                              <p className={`text-xs mt-2 font-medium ${
                                shutdownResults[robot.RobotId].ok ? "text-green-600" : "text-red-600"
                              }`}>
                                {shutdownResults[robot.RobotId].message}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShutdown(robot.RobotId);
                            }}
                            disabled={shuttingDownIds.has(robot.RobotId)}
                            className="shrink-0 px-3 py-1 bg-red-50 text-red-600 text-xs rounded-md hover:bg-red-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {shuttingDownIds.has(robot.RobotId) ? "Shutting down…" : "Shutdown"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Control Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Send Command</h2>
              
              {!selectedRobotId ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 italic">Select a robot to send commands</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selected Robot</label>
                    <div className="bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-800">
                      {robots.find((r) => r.RobotId === selectedRobotId)?.Name || selectedRobotId}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Python Code</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={6}
                      value={codeText}
                      onChange={(e) => setCodeText(e.target.value)}
                      placeholder="Enter Python code..."
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendCommand}
                      disabled={!codeText || cmdStatus === "loading"}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {cmdStatus === "loading" ? "Sending…" : "Send Command"}
                    </button>
                    <button
                      onClick={handleAbortCommand}
                      disabled={abortStatus === "loading"}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Abort
                    </button>
                  </div>
                  
                  {cmdResult && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Response</label>
                      <pre className="bg-gray-900 text-gray-100 rounded-md p-3 text-xs overflow-auto max-h-32 font-mono">
                        {cmdResult}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Monitoring */}
          <div className="lg:col-span-2 space-y-6">
            {/* Robot Logs and Output - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Robot Logs */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-800">Robot Logs</h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    !selectedRobotId ? "bg-gray-200 text-gray-500" :
                    wsStatus === "connected" ? "bg-green-100 text-green-700" :
                    wsStatus === "connecting" ? "bg-yellow-100 text-yellow-700 animate-pulse" :
                    wsStatus === "error" ? "bg-red-100 text-red-700" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {!selectedRobotId ? "Disabled" :
                     wsStatus === "connected" ? "Connected" :
                     wsStatus === "connecting" ? "Connecting…" :
                     wsStatus === "error" ? "Error" :
                     "Idle"}
                  </span>
                </div>
                {selectedRobotId && (
                  <button
                    onClick={() => setLogEntries([])}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              <div className="bg-gray-900 rounded-md p-4 h-64 overflow-y-auto font-mono text-xs">
                {!selectedRobotId ? (
                  <span className="text-gray-500">Select a robot to view logs</span>
                ) : logEntries.length === 0 ? (
                  <span className="text-gray-500">No logs yet…</span>
                ) : (
                  <>
                    {logEntries.map((entry, i) => (
                      <div
                        key={i}
                        className={`leading-6 ${
                          entry.level === "ERROR" ? "text-red-400" :
                          entry.level === "WARNING" ? "text-yellow-300" :
                          entry.level === "INFO" ? "text-green-400" :
                          "text-gray-300"
                        }`}
                      >
                        <span className="text-gray-500 mr-2">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ""}
                        </span>
                        <span className="mr-2 font-bold">[{entry.level}]</span>
                        {entry.message}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </>
                )}
              </div>
              </div>

              {/* Robot Output (stdout) */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-800">Robot Output</h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    !selectedRobotId ? "bg-gray-200 text-gray-500" :
                    printWsStatus === "connected" ? "bg-green-100 text-green-700" :
                    printWsStatus === "connecting" ? "bg-yellow-100 text-yellow-700 animate-pulse" :
                    printWsStatus === "error" ? "bg-red-100 text-red-700" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {!selectedRobotId ? "Disabled" :
                     printWsStatus === "connected" ? "Connected" :
                     printWsStatus === "connecting" ? "Connecting…" :
                     printWsStatus === "error" ? "Error" :
                     "Idle"}
                  </span>
                </div>
                {selectedRobotId && (
                  <button
                    onClick={() => setPrintEntries([])}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              <div className="bg-gray-900 rounded-md p-4 h-64 overflow-y-auto font-mono text-xs">
                {!selectedRobotId ? (
                  <span className="text-gray-500">Select a robot to view output</span>
                ) : printEntries.length === 0 ? (
                  <span className="text-gray-500">No output yet…</span>
                ) : (
                  <>
                    {printEntries.map((entry, i) => (
                      <div key={i} className="leading-6 text-green-300">
                        <span className="text-gray-500 mr-2">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ""}
                        </span>
                        {entry.text}
                      </div>
                    ))}
                    <div ref={printEndRef} />
                  </>
                )}
              </div>              </div>            </div>

            {/* Camera Feed */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Camera Feed</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  !selectedRobotId ? "bg-gray-200 text-gray-500" :
                  cameraWsStatus === "connected" ? "bg-green-100 text-green-700" :
                  cameraWsStatus === "connecting" ? "bg-yellow-100 text-yellow-700 animate-pulse" :
                  cameraWsStatus === "error" ? "bg-red-100 text-red-700" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {!selectedRobotId ? "Disabled" :
                   cameraWsStatus === "connected" ? "Connected" :
                   cameraWsStatus === "connecting" ? "Connecting…" :
                   cameraWsStatus === "error" ? "Error" :
                   "Idle"}
                </span>
              </div>
              
              <div className="bg-gray-900 rounded-md flex items-center justify-center overflow-hidden" style={{ minHeight: "300px" }}>
                {cameraFrameUrl ? (
                  <img src={cameraFrameUrl} alt="Robot camera" className="max-w-full h-auto rounded" />
                ) : (
                  <span className="text-gray-500 text-sm font-mono">
                    {!selectedRobotId ? "Select a robot to view camera feed" : "Waiting for frames…"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Logs Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Detailed Logs</h2>
          <div className="space-y-4">
            {/* Connection Test */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700">1. Broker Connection Test</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  connStatus === "ok" ? "bg-green-100 text-green-700" :
                  connStatus === "loading" ? "bg-yellow-100 text-yellow-700" :
                  connStatus === "error" ? "bg-red-100 text-red-700" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {connStatus}
                </span>
              </div>
              {connResult && (
                <pre className="bg-gray-100 rounded-md p-3 text-xs overflow-auto max-h-40 font-mono text-gray-800">
                  {connResult}
                </pre>
              )}
            </div>

            {/* Fetch Robots */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700">2. Fetch Robots</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  robotsStatus === "ok" ? "bg-green-100 text-green-700" :
                  robotsStatus === "loading" ? "bg-yellow-100 text-yellow-700" :
                  robotsStatus === "error" ? "bg-red-100 text-red-700" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {robotsStatus}
                </span>
              </div>
              {robotsResult && (
                <pre className="bg-gray-100 rounded-md p-3 text-xs overflow-auto max-h-40 font-mono text-gray-800">
                  {robotsResult}
                </pre>
              )}
            </div>

            {/* Send Command */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700">3. Send Command Response</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  cmdStatus === "ok" ? "bg-green-100 text-green-700" :
                  cmdStatus === "loading" ? "bg-yellow-100 text-yellow-700" :
                  cmdStatus === "error" ? "bg-red-100 text-red-700" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {cmdStatus}
                </span>
              </div>
              {cmdResult ? (
                <pre className="bg-gray-100 rounded-md p-3 text-xs overflow-auto max-h-40 font-mono text-gray-800">
                  {cmdResult}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 italic">No command sent yet</p>
              )}
            </div>

            {/* Abort Command */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700">4. Abort Command Response</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  abortStatus === "ok" ? "bg-green-100 text-green-700" :
                  abortStatus === "loading" ? "bg-yellow-100 text-yellow-700" :
                  abortStatus === "error" ? "bg-red-100 text-red-700" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {abortStatus}
                </span>
              </div>
              {abortResult ? (
                <pre className="bg-gray-100 rounded-md p-3 text-xs overflow-auto max-h-40 font-mono text-gray-800">
                  {abortResult}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 italic">No abort command sent yet</p>
              )}
            </div>

            {/* WebSocket Status */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">5. WebSocket Connections</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-xs text-gray-500 mb-1">Robot Logs</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    wsStatus === "connected" ? "bg-green-100 text-green-700" :
                    wsStatus === "connecting" ? "bg-yellow-100 text-yellow-700" :
                    wsStatus === "error" ? "bg-red-100 text-red-700" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {wsStatus}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-xs text-gray-500 mb-1">Robot Output</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    printWsStatus === "connected" ? "bg-green-100 text-green-700" :
                    printWsStatus === "connecting" ? "bg-yellow-100 text-yellow-700" :
                    printWsStatus === "error" ? "bg-red-100 text-red-700" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {printWsStatus}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-xs text-gray-500 mb-1">Camera Feed</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    cameraWsStatus === "connected" ? "bg-green-100 text-green-700" :
                    cameraWsStatus === "connecting" ? "bg-yellow-100 text-yellow-700" :
                    cameraWsStatus === "error" ? "bg-red-100 text-red-700" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {cameraWsStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerTestPage;