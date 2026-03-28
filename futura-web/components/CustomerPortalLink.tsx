'use client'

type Props = {
  url?: string
}

export function CustomerPortalLink({ url }: Props) {
  const fallbackUrl = 'https://www.revenuecat.com/docs/web/web-billing/web-sdk'
  const href = url || fallbackUrl

  return (
    <a href={href} target="_blank" rel="noreferrer">
      Manage Subscription
    </a>
  )
}
