export const testBrokerConnection = async () => {
  const response = await fetch('/api/broker/test', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Broker connection failed');
  }

  return response.json();
};

export const fetchRobots = async () => {
  const response = await fetch('/api/broker/robots', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch robots');
  }

  return response.json();
};

export const sendCommand = async (robotId: string, code: string, ustId: number | null = null) => {
  const response = await fetch(`/api/broker/robots/${robotId}/command`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      user_started_task_id: ustId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send command');
  }

  return response.json();
};

export const sendAbort = async (robotId: string) => {
  const response = await fetch(`/api/broker/robots/${robotId}/abort`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send abort');
  }
  return response.json();
};

export const shutdownRobot = async (robotId: string) => {
  const response = await fetch(`/api/broker/robots/${robotId}/shutdown`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to shutdown robot');
  }
  return response.json();
};

export const safeCloseWs = (ws: WebSocket | null) => {
  if (ws && ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
    ws.close();
  }
};

export const connectRobotCameraSocket = (
  robotId: string,
  onFrame: (blob:Blob) => void,
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void,
): WebSocket => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.host}/api/broker/robots/${robotId}/camera`;

  onStatusChange('connecting');
  const ws = new WebSocket(url);
  ws.binaryType = 'blob';

  ws.onopen = () => onStatusChange('connected');
  ws.onclose = () => onStatusChange('disconnected');
  ws.onerror = () => onStatusChange('error');
  ws.onmessage = (event) => {
    try {
      if (event.data instanceof Blob) {
        // Raw binary frame from the video pipeline.
        // The BridgeNode sends bytes(msg.data) with no format metadata, so
        // we must tag explicitly. The ROS ImageCompressorNode always encodes
        // to WebP — tag accordingly so browsers don't need to content-sniff.
        const blob = event.data.type
          ? event.data
          : new Blob([event.data], { type: 'image/webp' });
        onFrame(blob);
      } else if (typeof event.data === 'string') {
        // rosbridge JSON envelope:
        //   { op: "publish", topic: "/robot/camera_frame",
        //     msg: { format: "webp" | "jpeg", data: "<base64>" } }
        // or a flat { format, data } from custom servers.
        const parsed = JSON.parse(event.data);
        const msg: { format?: string; data?: string } = parsed.msg ?? parsed;

        if (msg?.data && typeof msg.format === 'string') {
          const fmt = msg.format.toLowerCase();
          const mimeType = fmt.includes('webp') ? 'image/webp'
            : fmt.includes('jpeg') || fmt.includes('jpg') ? 'image/jpeg'
            : fmt.includes('png') ? 'image/png'
            : 'application/octet-stream';

          const raw = atob(msg.data);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          onFrame(new Blob([bytes], { type: mimeType }));
        } else {
          console.warn('[camera] Unexpected message shape:', parsed);
        }
      }
    } catch (error) {
      console.error('[camera] Error processing message:', error, event.data);
    }
  };
  return ws;
};

export const connectRobotPrintSocket = (
  robotId: string,
  onMessage: (entry: { RobotId: string; Timestamp: string; Text: string }) => void,
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void,
): WebSocket => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.host}/api/broker/robots/${robotId}/stdout`;

  onStatusChange('connecting');
  const ws = new WebSocket(url);
  ws.onopen = () => onStatusChange('connected');
  ws.onclose = () => onStatusChange('disconnected');
  ws.onerror = () => onStatusChange('error');
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.RobotId !== undefined) {
        onMessage(data as { RobotId: string; Timestamp: string; Text: string });
      }
    } catch {

      onMessage({ RobotId: robotId, Timestamp: new Date().toISOString(), Text: event.data });
    }
  };

  return ws;
};

export const connectRobotLogSocket = (
  robotId: string,
  onMessage: (log: { LogLevel: string; Message: string; RobotId?: string; Timestamp?: string }) => void,
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void,
): WebSocket => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.host}/api/broker/robots/${robotId}/logs`;

  onStatusChange('connecting');
  const ws = new WebSocket(url);

  ws.onopen = () => onStatusChange('connected');
  ws.onclose = () => onStatusChange('disconnected');
  ws.onerror = () => onStatusChange('error');
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      onMessage({ LogLevel: 'RAW', Message: event.data });
    }
  };

  return ws;
};