import {useTaskConfig} from "../../hooks/useTaskConfig.ts";

interface Props {
  activeS: boolean;
  setActiveS: (active: boolean) => void;
  activeI: boolean;
  setActiveI: (active: boolean) => void;
  setEditor: (editor: string) => void;
}

const CodeHeader = ({activeS, setActiveS, activeI, setActiveI, setEditor}: Props) => {
  const {mode, taskPreview} = useTaskConfig()
  const editingMode = mode === 'edit' || mode === 'create'
  const styleS = activeS ? 'bg-tomato-600' : 'bg-tomato-300 pt-2 pb-3.5 translate-y-1.5 hover:bg-tomato-600 hover:translate-y-0.5';
  const styleI = activeI ? 'bg-tomato-600' : 'bg-tomato-300 pt-2 pb-3.5 translate-y-1.5 hover:bg-tomato-600 hover:translate-y-0.5';

  const handleClickS = () => {
    setActiveI(false);
    setActiveS(!activeS);
  }

  const handleClickI = () => {
    setActiveS(false);
    setActiveI(!activeI);
  }

  return (
    <div className="header flex-between font-display">
      <div className="flex">

        {editingMode ? (
          <>
            <div className="bg-sunglow-400 text-dark-neutrals-400 tab hover:bg-sunglow-600 hover:cursor-pointer"
                 onClick={() => {setEditor('python')}}>
              Uređivač koda
            </div>

            <div className="bg-sunglow-400 text-dark-neutrals-400 tab hover:bg-sunglow-600 hover:cursor-pointer"
                 onClick={() => {setEditor('blockly')}}>
              Uređivač blokova
            </div>
        </>
        ) : (
          <div className="bg-sunglow-400 text-dark-neutrals-400 tab">
              Uređivač koda
            </div>
          )
        }

      </div>

      {mode == 'solve' && (
        <span className={'mb-2 text-dark-neutrals-400'}>{taskPreview}</span>
      )}

      <div className={'flex'}>
        <div
          className={`${styleI} text-light tab hover:cursor-pointer transition`}
          onClick={handleClickI}
        >
          <h1>Upute</h1>
        </div>

        <div
          className={`${styleS} text-light tab hover:cursor-pointer transition`}
          onClick={handleClickS}
        >
          <h1>Priručnik</h1>
        </div>
      </div>

    </div>
  );
};

export default CodeHeader;
