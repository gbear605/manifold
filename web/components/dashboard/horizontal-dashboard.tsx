import clsx from 'clsx'
import { type Contract } from 'common/contract'
import {
  Dashboard,
  DashboardItem,
  DashboardQuestionItem,
} from 'common/dashboard'
import { LinkPreviews } from 'common/link-preview'
import { useEffect, useState } from 'react'
import { key } from 'web/components/dashboard/dashboard-content'
import { Row } from 'web/components/layout/row'
import { useContracts } from 'web/hooks/use-contract-supabase'
import { useDashboardFromSlug } from 'web/hooks/use-dashboard'
import { useSaveReferral } from 'web/hooks/use-save-referral'
import { useUser } from 'web/hooks/use-user'
import {
  DashboardNewsItemPlaceholder,
  MaybeDashboardNewsItem,
} from '../news/dashboard-news-item'
import { Carousel } from '../widgets/carousel'
import { DashboardText } from './dashboard-text-card'
import { HorizontalDashboardCard } from './horizontal-dashboard-card'

export function HorizontalDashboard(props: {
  initialDashboard: Dashboard
  previews: LinkPreviews
  initialContracts: Contract[]
  slug: string
}) {
  const user = useUser()
  useSaveReferral(user)

  const { initialDashboard, slug, previews, initialContracts } = props
  const fetchedDashboard = useDashboardFromSlug(slug)
  const [dashboard, setDashboard] = useState<Dashboard>(initialDashboard)

  // Update the dashboard state if a new fetchedDashboard becomes available
  useEffect(() => {
    if (fetchedDashboard) {
      setDashboard(fetchedDashboard)
    }
  }, [fetchedDashboard])

  const questions = dashboard.items.filter(
    (x): x is DashboardQuestionItem => x.type === 'question'
  )

  const slugs = questions.map((q) => q.slug)
  const contracts = useContracts(slugs, 'slug', initialContracts)
  const dashboardLength = dashboard.items.length

  if (dashboardLength === 0) {
    return <></>
  }
  if (dashboardLength < 2) {
    return (
      <>
        {' '}
        {dashboard.items.map((item) => (
          <HorizontalCard
            key={key(item)}
            item={item}
            previews={previews}
            contracts={contracts}
            className={clsx(
              'from-primary-100 to-canvas-0 via-canvas-0 w-full bg-gradient-to-t'
            )}
          />
        ))}
      </>
    )
  }
  if (dashboardLength == 2) {
    return (
      <>
        <Row className="hidden gap-2 sm:flex">
          {dashboard.items.map((item) => (
            <HorizontalCard
              key={key(item)}
              item={item}
              previews={previews}
              contracts={contracts}
              className={clsx(
                'from-primary-100 to-canvas-0 via-canvas-0 w-1/2 bg-gradient-to-t'
              )}
            />
          ))}
        </Row>
        <Carousel className="w-full max-w-3xl sm:hidden">
          {dashboard.items.map((item) => (
            <HorizontalCard
              key={key(item)}
              item={item}
              previews={previews}
              contracts={contracts}
              className={clsx(
                'from-primary-100 to-canvas-0 via-canvas-0 min-w-[320px] bg-gradient-to-t'
              )}
            />
          ))}
        </Carousel>
      </>
    )
  }
  return (
    <>
      <Carousel className="w-full max-w-3xl">
        {dashboard.items.map((item) => (
          <HorizontalCard
            key={key(item)}
            item={item}
            previews={previews}
            contracts={contracts}
            className={clsx(
              'from-primary-100 to-canvas-0 via-canvas-0 min-w-[320px] bg-gradient-to-t'
            )}
          />
        ))}
      </Carousel>
    </>
  )
}

const HorizontalCard = (props: {
  item: DashboardItem
  setItem?: (item: DashboardItem) => void
  previews?: LinkPreviews
  contracts: Contract[]
  isEditing?: boolean
  className?: string
}) => {
  const { item, setItem, previews, contracts, isEditing, className } = props

  if (item.type === 'link') {
    const preview = previews?.[item.url]

    return (
      <MaybeDashboardNewsItem
        url={item.url}
        preview={preview}
        className={clsx(isEditing && 'pointer-events-none', className)}
      />
    )
  }

  if (item.type === 'question') {
    const contract = contracts.find((c) => c.slug === item.slug)
    if (!contract) return <DashboardNewsItemPlaceholder pulse />
    return (
      <HorizontalDashboardCard
        key={contract.id}
        contract={contract}
        showGraph
        className={className}
      />
    )
  }

  if (item.type === 'text') {
    return (
      <DashboardText
        content={item.content}
        editing={isEditing}
        onSave={(content) => setItem?.({ ...item, content })}
      />
    )
  }

  // should be never
  return item
}
