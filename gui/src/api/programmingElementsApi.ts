import { ProgrammingElementOption } from '../types/activityTypes.ts'

export const getProgrammingElements = async (): Promise<ProgrammingElementOption[]> => {
  const response = await fetch('/api/programming-elements/', {
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Programske elemente nije moguće učitati.')
  }

  return response.json()
}