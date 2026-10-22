const SimTab = () => {
  return (
    <li className={`bg-turquoise-700 text-light py-2 tab peer-checked:bg-turquoise-700`}>
      <label className="block">
        <span className={'cursor-pointer'}>Simulator</span>
      </label>
    </li>
  );
};

export default SimTab;