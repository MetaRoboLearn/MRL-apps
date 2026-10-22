import SimPlayground from "./SimPlayground.tsx";
import SimHeader from "./UI/SimHeader.tsx";
import {useTaskConfig} from "../../hooks/useTaskConfig.ts";
import CamScreen from "./Camera/CamScreen.tsx";
import SimPopUp from "./SimPopUp.tsx";
import SimOptions from "./UI/SimOptions.tsx";
import SimConsole from "./SimConsole.tsx";

const SimScreen = () => {
  const { camMode, editMode, mode, awaitingReview } = useTaskConfig();
  const showOptions = mode === 'edit' || mode === 'create'

  const show = () => {
    if (camMode) return <CamScreen />
    if (editMode && !camMode && showOptions) return <SimOptions />
    return <SimPlayground />
  }

  return (
    <div className={`w-2/5 flex-center flex-col box-border z-20 relative`}>
      <SimHeader />
      {awaitingReview && <SimPopUp />}
      {show()}
      <SimConsole />
    </div>
  );
};

export default SimScreen;
