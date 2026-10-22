import {useTaskConfig} from "../../hooks/useTaskConfig.ts";
import {RichTextEditor} from "../UI/RichTextEditor.tsx";

const CodeInstructions = ({hidden}: {hidden: boolean}) => {
  const {instructions} = useTaskConfig()
  return (
    <div className={`${hidden ? 'hidden' : ''}`}>
      <h1 className={'mb-5 w-full text-center font-display font-bold text-2xl tracking-wide text-dark-neutrals-400'}>Upute za rješavanje!</h1>
        {instructions == '' ? (
          <div className={'w-full text-center text-dark-neutrals-400'}>Nema uputa!</div>
        ) : (
          <div className={'bg-white mx-3 rounded-md text-dark-neutrals-400'}>
            <RichTextEditor value={instructions} readOnly className={'h-full'} />
          </div>
        )}
    </div>
  );
};

export default CodeInstructions;
