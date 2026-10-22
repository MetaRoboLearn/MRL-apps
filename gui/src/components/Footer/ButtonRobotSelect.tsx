import { useState, useEffect } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { fetchRobots } from "../../api/brokerApi.ts";
import { IoRefresh } from "react-icons/io5";

interface Robot {
  RobotId: string;
  Name: string;
  IsActivated: boolean;
  ActivatedOnSSID: string | null;
}

const robotsQueryOptions = queryOptions<Robot[]>({
  queryKey: ["robots"],
  queryFn: fetchRobots,
  refetchOnWindowFocus: false,
});

interface Props {
  disabled: boolean;
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string) => void;
}

const ButtonRobotSelect = ({ disabled, selectedRobotId, onSelectRobot }: Props) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReady(true);
      });
    });
  }, []);

  const { data: robots = [], isLoading, refetch, isFetching } = useQuery({
    ...robotsQueryOptions,
    enabled: ready,
  });

  const activeRobots = robots.filter((r) => r.IsActivated);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="flex items-center gap-2">
      <select
        disabled={disabled || isLoading || !ready}
        value={selectedRobotId || ""}
        onChange={(e) => onSelectRobot(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {!ready || isLoading ? (
          <option value="">Učitavanje…</option>
        ) : activeRobots.length === 0 ? (
          <option value="">Nema aktivnih robota..</option>
        ) : (
          <>
            <option value="" disabled>Odaberi robota</option>
            {activeRobots.map((robot) => (
              <option key={robot.RobotId} value={robot.RobotId}>
                {robot.Name} ({robot.RobotId.slice(0, 8)}…)
              </option>
            ))}
          </>
        )}
      </select>
      <button
        onClick={handleRefresh}
        disabled={disabled || isFetching}
        className={`p-2 rounded border border-gray-300 hover:bg-gray-100 transition ${
          isFetching ? "animate-spin" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Osvježi popis robota"
      >
        <IoRefresh size={16} />
      </button>
    </div>
  );
};

export default ButtonRobotSelect;