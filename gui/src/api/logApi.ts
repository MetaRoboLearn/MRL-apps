export const EventTypes = {
  CODE_EDIT: 1,
  SIM_RUN: 2,
  SIM_CODE_ERR: 3,
  SIM_END_SUCC: 4,
  SIM_END_FAIL: 5,
  ROBOT_RUN: 6,
  ROBOT_CODE_ERR: 7,
  ROBOT_END_SUCC: 8,
  ROBOT_END_FAIL: 9,
  TASK_START: 10,
  TASK_CONTINUE: 11,
  TASK_FINISH: 12,
} as const;

export const createLog = async (
  userStartedTaskId: number | null,
  eventTypeId: number,
  codeSnapshot?: string | null,
) => {
  if (!userStartedTaskId) return
  const response = await fetch("/api/user-task-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      user_started_task_id: userStartedTaskId,
      event_type_id: eventTypeId,
      code_snapshot: codeSnapshot,
    }),
  });
  return response.json();
};