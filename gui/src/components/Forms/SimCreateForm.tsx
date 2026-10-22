import {useState} from "react";
import {useUI} from "../../hooks/useUI.ts";

const SimCreateForm = () => {
  const { setModalVisible } = useUI();

  const [id, setId] = useState<string>('');
  const [x, setX] = useState<string>('');
  const [z, setZ] = useState<string>('');
  const [mode, setMode] = useState<string>('python');

  const clear= () =>{
    setId('');
    setX('');
    setZ('');
  }

  const create = () => {
    if(localStorage.getItem(id)) return

    localStorage.setItem(id, JSON.stringify({
      "mode": mode,
      "sizeX": x,
      "sizeZ": z,
      "start": null,
      "startRotationOffset": 0,
      "finish": null,
      "barriers": [],
      "stickers": [],
      "code": "",
      "blocks": ""
    }));

    // setSelectedTab(id);
  }

  return (
    <>
      <div className={'flex flex-col mb-3'}>
        <label className={'mr-5 text-lg'}>Oznaka</label>
        <input type='text'
               placeholder={'Unesite oznaku'}
               value={id}
               onChange={(e) => setId(e.target.value)}
               className={'modal-form-input'}/>
      </div>
      <div className={'flex justify-between w-full'}>
        <div className={'flex flex-col mr-2'}>
          <label className={'mr-5 text-lg'}>Širina</label>
          <input type='text'
                 placeholder={'Unesite širinu'}
                 value={x}
                 onChange={(e) => setX(e.target.value)}
                 className={'modal-form-input'}/>
        </div>
        <div className={'flex flex-col'}>
          <label className={'mr-5 text-lg'}>Dužina</label>
          <input type='text'
                 placeholder={'Unesite dužinu'}
                 value={z}
                 onChange={(e) => setZ(e.target.value)}
                 className={'modal-form-input'}/>
        </div>
      </div>
      <div className="flex justify-between w-full mt-3">
        <div className="flex flex-col w-full">
          <label className="mr-5 text-lg">Način</label>
          <div className="flex w-full">
            <label className="flex-1">
              <input
                type="radio"
                name="mode"
                value="python"
                checked={mode === 'python'}
                onChange={(e) => setMode(e.target.value)}
                className="hidden"
              />
              <span
                className={`block text-center py-1.5 transition cursor-pointer 
          ${
                  mode === 'python'
                    ? 'bg-sunglow-600 font-semibold'
                    : 'bg-sunglow-600/50 hover:bg-sunglow-600/70'
                } 
          rounded-l-xl border border-sunglow-600 transition`}
              >
          Python
        </span>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="mode"
                value="blockly"
                checked={mode === 'blockly'}
                onChange={(e) => setMode(e.target.value)}
                className="hidden"
              />
              <span
                className={`block text-center py-1.5 transition cursor-pointer 
          ${
                  mode === 'blockly'
                    ? 'bg-sunglow-600 font-semibold'
                    : 'bg-sunglow-600/50 hover:bg-sunglow-600/70'
                } 
          rounded-r-xl border border-sunglow-600 border-l-0`}
              >
          Blockly
        </span>
            </label>
          </div>
        </div>
      </div>

      <div className={'text-lg pt-8 text-right'}>
        <span
          className={'modal-form-button mr-3'}
          onClick={() => {
            setModalVisible(false);
            create();
            clear();
          }}>Stvori
        </span>
        <span
          className={'modal-form-button'}
          onClick={() => {
            setModalVisible(false);
            clear();
          }}>Odustani
        </span>
      </div>
    </>
  );
};

export default SimCreateForm;