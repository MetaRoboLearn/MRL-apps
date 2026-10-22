import { createFileRoute } from '@tanstack/react-router'
import BrokerTestPage from '../../pages/BrokerTestPage'

export const Route = createFileRoute('/admin/robots')({
  component: RouteComponent,
})

function RouteComponent() {
  return <BrokerTestPage />
}
