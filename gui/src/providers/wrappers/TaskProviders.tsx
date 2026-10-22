import {VehicleProvider} from "../VehicleProvider.tsx";
import GridProvider from "../GridProvider.tsx";
import {CodeProvider} from "../CodeProvider.tsx";
import {PropsWithChildren} from "react";
import {TaskConfigProvider} from "../TaskConfigProvider.tsx";
import {Task, TaskMode} from "../../types/tasksTypes.ts";
import {UserStartedTask} from "../../types/userStartedTasksTypes.ts";
import {ConsoleProvider} from "../ConsoleProvider.tsx";
import RobotSocketManager from "../../components/Simulator/RobotSocketManager.tsx";

interface Props {
  ust?: UserStartedTask;
  task: Task;
  code: string;
  blocks: string;
  mode?: TaskMode;
  onCodeSave?: (currentValue: string) => void;
}

const TaskProviders = ({ ust, task, code, blocks, mode, onCodeSave, children }: PropsWithChildren<Props>) => {
  return (
    <ConsoleProvider>
      <TaskConfigProvider ust={ust} task={task} mode={mode}>
        <RobotSocketManager />
          <GridProvider task={task}>
            <CodeProvider
              init_code={code}
              init_blocks={blocks}
              editorMode={ust?.activity_task.task_type}
              onSave={mode === 'solve' ? onCodeSave : undefined}
            >
              <VehicleProvider>
                {children}
              </VehicleProvider>
          </CodeProvider>
        </GridProvider>
      </TaskConfigProvider>
    </ConsoleProvider>
  );
};

export default TaskProviders;