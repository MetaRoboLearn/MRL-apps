import {GridState} from "../types/tasksTypes.ts";

export const run_code = async (
  code: string,
  currentValue: string,
  ustId: number | null = null,
  gridState: GridState | null = null,
) => {
  const url = "/api/sandbox/run-python";
  try {
    const response = await fetch(url, {
      credentials: 'include',
      method: "POST",
      body: JSON.stringify({
        code,
        user_started_task_id: ustId,
        code_snapshot: currentValue,
        grid_state: gridState,
      }),
      headers: {
        "Content-Type": "application/json",
      }
    });
    return await response.json();
  } catch (e) {
    if (e instanceof Error) {
      return {
        error: e.message,
        output: ''
      };
    }
  }
}