import { lazy, Suspense, useState } from 'react'
import { PageSkeleton } from '../../components/Skeleton'
import { Segmented } from '../../components/Segmented'

const pages = {
  deudas: lazy(() => import('./BillsPage')),
  plan: lazy(() => import('../plan/PlanPage')),
  asesor: lazy(() => import('../advisor/AsesorPage')),
}

const tabs = [
  { id: 'deudas', label: 'Mis deudas' },
  { id: 'plan', label: 'Plan' },
  { id: 'asesor', label: 'Asesor' },
] as const

export default function DeudasPage() {
  const [tab, setTab] = useState<keyof typeof pages>('deudas')
  const Page = pages[tab]

  return (
    <div className="space-y-6">
      <Segmented
        name="deudas-tab"
        label="Sección de deudas"
        options={[...tabs]}
        value={tab}
        onChange={setTab}
        className="w-full sm:w-96"
      />
      <Suspense fallback={<PageSkeleton />}>
        <Page />
      </Suspense>
    </div>
  )
}
