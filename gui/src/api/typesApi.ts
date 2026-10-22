// api/typesApi.ts
export interface TaskType {
  id: number;
  name: string;
}

export const getTypes = async (): Promise<TaskType[]> => {
  const response = await fetch('/api/types/', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Vrste zadataka nije moguće učitati.');
  }

  return response.json();
};