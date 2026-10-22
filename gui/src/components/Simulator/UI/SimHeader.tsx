import CamTab from "../Camera/CamTab.tsx";
import SimTab from "./SimTab.tsx";
import SimOptionsTab from "./SimOptionsTab.tsx";
import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";

const SimHeader = () => {
  const { mode } = useTaskConfig()
  const showOptions = mode === 'edit' || mode === 'create'

  return (
    <ul className={'header flex-between font-display'}>
      <div className={'flex'}>
        <CamTab />
        {showOptions && <SimOptionsTab />}
      </div>
      <SimTab />
    </ul>
  );
};

export default SimHeader;
