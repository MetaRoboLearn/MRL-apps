import {useGrid} from "../../../hooks/useGrid.ts";
import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";
import {useState} from "react";

const SimOptions = () => {
  const {
    sizeX, setSizeX,
    sizeZ, setSizeZ,
    floorColor, setFloorColor,
  } = useGrid()
  const {
    title, setTitle,
    description, setDescription,
    isActive, setIsActive,
    modelPath, setModelPath,
    modelsConfig,
  } = useTaskConfig()

  const [tempSizeX, setTempSizeX] = useState<string>(String(sizeX))
  const [tempSizeZ, setTempSizeZ] = useState<string>(String(sizeZ))
  const [dimError, setDimError] = useState<string | null>(null)

  const changeDim = () => {
    const x = Number(tempSizeX) || 3
    const z = Number(tempSizeZ) || 3

    if (x < 3 || z < 3) {
      setDimError("Both dimensions must be at least 3.")
      return
    }
    setDimError(null)
    setSizeX(x)
    setSizeZ(z)
  }

  const defaultFloorColor = '#3f9b0b';
  const activeFloorColor = floorColor ?? defaultFloorColor;

  return (
    <div className="bg-tomato-50 flex flex-col flex-grow items-center w-full border-t-8 border-y-10 border-tomato-500 relative overflow-hidden p-12 gap-3 font-display">

      <div className="w-full">
        <label className="block text-sm font-semibold mb-1 text-gray-800">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-500 rounded-md text-gray-900"
          placeholder="Task title"
        />
      </div>

      <div className="w-full">
        <label className="block text-sm font-semibold mb-1 text-gray-800">Description</label>
        <input
          type="text"
          value={description || ''}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-500 rounded-md text-gray-900"
          placeholder="Optional description"
        />
      </div>

      <div className="w-full">
        <div className="flex gap-3 w-full">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-800">Size X *</label>
            <input
              type="number"
              min={3}
              value={tempSizeX}
              onChange={(e) => { setTempSizeX(e.target.value); setDimError(null); }}
              className={`w-full px-3 py-2 border rounded-md text-gray-900 ${dimError ? 'border-red-500' : 'border-gray-500'}`}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-800">Size Z *</label>
            <input
              type="number"
              min={3}
              value={tempSizeZ}
              onChange={(e) => { setTempSizeZ(e.target.value); setDimError(null); }}
              className={`w-full px-3 py-2 border rounded-md text-gray-900 ${dimError ? 'border-red-500' : 'border-gray-500'}`}
            />
          </div>
          <button
            onClick={changeDim}
            className="flex-1 px-3 py-2 bg-tomato-500 hover:bg-tomato-600 text-white font-semibold rounded-md self-end transition-colors cursor-pointer"
          >
            Postavi
          </button>
        </div>
        {dimError && <p className="mt-1 text-sm text-red-600 font-semibold">{dimError}</p>}
      </div>

      <div className="w-full">
        <label className="block text-sm font-semibold mb-1 text-gray-800">Floor Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={activeFloorColor}
            onChange={(e) => setFloorColor(e.target.value)}
            className="w-10 h-10 rounded border border-gray-500 cursor-pointer p-0.5"
          />
          <span className="text-sm text-gray-700">{activeFloorColor}</span>
          {floorColor !== null && (
            <button
              onClick={() => setFloorColor(null)}
              className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md font-medium transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {modelsConfig && (
        <div className="w-full">
          <label className="block text-sm font-semibold mb-1 text-gray-800">Vehicle Model</label>
          <select
            value={modelPath ?? modelsConfig.default_path}
            onChange={(e) => {
              const val = e.target.value;
              setModelPath(val === modelsConfig.default_path ? null : val);
            }}
            className="w-full px-3 py-2 border border-gray-500 rounded-md text-gray-900"
          >
            {modelsConfig.models.map((m) => (
              <option key={m.id} value={m.path}>
                {m.name}{m.path === modelsConfig.default_path ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-6 w-full">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="font-semibold text-gray-800">Active</span>
        </label>
      </div>

    </div>
  );
};

export default SimOptions;