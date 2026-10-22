import { useEffect, useRef } from "react";
import {useConsole} from "../../hooks/useConsole.ts";

const levelColor: Record<string, string> = {
  ERROR: "text-red-500",
  WARNING: "text-amber-600",
  INFO: "text-teal-600",
  OUTPUT: "text-gray-700",
  DISPLAY: "text-orange-600"
};

const SimConsole = () => {
  const { logs, clearLogs } = useConsole();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="w-full flex flex-col border-b-10 border-gray-200">
      <div className="font-display flex items-center justify-between px-3 py-1.5 bg-gray-200 border-t border-gray-300">
        <span className="text-xs font-semibold text-gray-500 uppercase">Konzola</span>
        <button onClick={clearLogs} className="text-xs text-gray-400 hover:text-gray-600 transition">
          Obriši
        </button>
      </div>
      <div className="w-full h-32 overflow-y-auto bg-gray-100 px-3 py-2 font-mono text-xs">
        {logs.length === 0 && <span className="text-gray-400">Nema logova...</span>}
        {logs.map((entry, i) => (
          <div key={i} className={`leading-5 ${levelColor[entry.level] || "text-gray-700"}`}>
            <span className="text-gray-400 mr-2">{entry.timestamp.toLocaleTimeString()}</span>
            <span className="font-bold mr-2">[{entry.level}]</span>
            {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default SimConsole;