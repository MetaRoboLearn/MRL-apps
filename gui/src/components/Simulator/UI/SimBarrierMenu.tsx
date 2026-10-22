import { Barrier, Barriers } from "../../../types.ts";
import { useTaskConfig } from "../../../hooks/useTaskConfig.ts";

const SimBarrierMenu = () => {
  const { selectedBarrier, setSelectedBarrier, barriers3D, setBarriers3D } = useTaskConfig();

  return (
    <div>
      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={barriers3D}
          onChange={() => setBarriers3D(!barriers3D)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500"
        />
        <label className="text-white text-sm font-semibold ml-2">3D</label>
      </div>
      <div className="flex flex-wrap gap-2 overflow-y-auto max-h-40 scrollbar-blue">
        {Object.values(Barrier).map((label: string, index) => (
          <label key={index} className="block cursor-pointer">
            <input
              type="radio"
              name="barrier"
              value={label}
              className="hidden peer"
              checked={selectedBarrier?.toString() === label}
              onChange={() => setSelectedBarrier(label as Barrier)}
            />
            <div className="w-16 h-16 flex flex-col items-center justify-center rounded-lg bg-white-smoke-400
                            hover:bg-turquoise-700 hover:text-white-smoke-50
                            peer-checked:ring-2 peer-checked:ring-white peer-checked:bg-turquoise-700 peer-checked:text-white-smoke-50
                            transition">
              <img src={Barriers[label as Barrier].image} alt={label} className="w-8 h-8 object-contain" />
              <span className="text-[10px] font-semibold mt-0.5">{label.toUpperCase()}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default SimBarrierMenu;