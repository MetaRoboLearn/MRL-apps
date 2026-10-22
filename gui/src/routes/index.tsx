import { createFileRoute } from '@tanstack/react-router'
import ActivityContainer from "../components/Landing/ActivityContainer.tsx";

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="relative w-4/5 min-w-200 mx-auto font-display p-10">
      <div className="text-center mb-14">
        <h1 className="text-5xl font-bold text-dark-neutrals-500 tracking-wide">Tvoje aktivnosti</h1>
        <div className="mt-3 mx-auto w-24 h-1 bg-sunglow-400 rounded-full"/>
      </div>
      <ActivityContainer/>
    </div>
  )
}