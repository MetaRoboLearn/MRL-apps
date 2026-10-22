import {queryOptions, useQuery} from '@tanstack/react-query'
import {getAvailableActivities} from "../../api/activitiesApi.ts";
import {capitalizeFirstLetter, formatLocalDateTime} from "../../utils.ts";
import ButtonSolveStart from "../Solve/ButtonSolveStart.tsx";
import ButtonSolveContinue from "../Solve/ButtonSolveContinue.tsx";
import {useAuth} from "../../hooks/useAuth.ts";

const availableActivitiesQueryOptions = queryOptions({
  queryKey: ['activities', 'available'],
  queryFn: getAvailableActivities,
  retry: false,
})

const ActivityContainer = () => {
  // const { data: activities } = useSuspenseQuery(availableActivitiesQueryOptions)
  const { user } = useAuth();
  const { data: activities, isLoading } = useQuery({
    ...availableActivitiesQueryOptions,
    enabled: !!user,
  });

  if (isLoading || !activities) {
    return <div>Loading...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white p-10 border-3 border-white-smoke-500 rounded-md text-center">
        <div className="text-5xl mb-4">🎒</div>
        <h2 className="text-2xl font-bold text-dark-neutrals-400">Trenutno nema aktivnosti</h2>
        <p className="mt-2 text-dark-neutrals-300">Vrati se kasnije, tvoji učitelji će uskoro pripremiti nešto za tebe!</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 bg-white p-6 border-3 border-white-smoke-500 rounded-md">
      {activities.map((a, i_a) => (
        <div className={'space-y-2'} key={i_a}>
          <div key={a.id} className="bg-sunglow-300 border-3 border-sunglow-600 px-10 py-6 rounded-md text-dark-neutrals-500 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-2xl">{a.title}</h2>
              {a.description && (
                <p className="mt-1 text-dark-neutrals-400">{a.description}</p>
              )}
            </div>
            <div className="flex gap-8 ml-8 shrink-0">
              <div>
                <div className="font-bold uppercase tracking-wide text-lg text-dark-neutrals-400">Početak</div>
                <div className="mt-1 font-medium">{formatLocalDateTime(a.time_from)}</div>
              </div>
              <div>
                <div className="font-bold uppercase tracking-wide text-lg text-dark-neutrals-400">Kraj</div>
                <div className="mt-1 font-medium">{formatLocalDateTime(a.time_to)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2 flex flex-col items-end pl-10 relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-turquoise-400 rounded-full"/>
            {a.activity_tasks.map((at, i_at) => (
              <div key={at.activity_task_id} className="w-full bg-turquoise-100 border-2 border-turquoise-400 px-6 py-4 rounded-md text-dark-neutrals-500 flex items-center justify-between relative">
                <div className="absolute -left-6 top-1/2 w-6 h-0.5 bg-turquoise-400" />
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <span className="bg-turquoise-400 text-white font-bold text-sm w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    {i_at + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                      <span>{at.task_title}</span>
                      {at.difficulty != null && (
                        <span className="flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                          <span className="text-yellow-700/80">Težina</span>
                            <span className="tracking-wide text-yellow-500">
                            {'★'.repeat(at.difficulty)}
                          </span>
                        </span>
                      )}
                    </div>
                    {at.preview && (<div className="text-sm text-dark-neutrals-400 mt-0.5">{at.preview}</div>)}
                  </div>
                </div>
                <div className="flex items-center gap-6 ml-6 shrink-0">
                  <span>
                    <span className="mr-2">Tip zadatka:</span>
                    <span className="font-bold text-dark-neutrals-400">{capitalizeFirstLetter(at.task_type)}</span>
                  </span>
                  {at.is_finished ? (
                    <span className="font-bold text-turquoise-600">Završeno</span>
                  ) : at.started ? (
                    <ButtonSolveContinue activityTaskId={at.activity_task_id} />
                  ) : (
                    <ButtonSolveStart activityTaskId={at.activity_task_id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityContainer;