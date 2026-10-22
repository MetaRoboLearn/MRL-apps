export type LogEntry = {
  level: "INFO" | "ERROR" | "WARNING" | "OUTPUT" | "DISPLAY";
  message: string;
  timestamp: Date;
}