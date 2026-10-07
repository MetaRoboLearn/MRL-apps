import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityForm } from '../../../components/Activity/ActivityForm.tsx';
import { createActivity } from '../../../api/activitiesApi.ts';
import { CreateActivityRequest } from '../../../types/activityTypes.ts';

export const Route = createFileRoute('/admin/activities/new')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: createActivity,
    onSuccess: (data) => {
      navigate({ to: '/admin/activities/$activityId', params: { activityId: data.id.toString() } });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (data: CreateActivityRequest) => {
    setError(undefined);
    console.log('Submitting:', data);
    await mutation.mutateAsync(data);
  };

  return (
    <div className="readable-content mx-auto w-full max-w-2xl p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-bold">Stvori aktivnost</h1>
      <ActivityForm
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        error={error}
      />
    </div>
  );
}