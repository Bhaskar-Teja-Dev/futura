'use client'

import { Purchases, type Offering, type Package } from '@revenuecat/purchases-js'

const RC_ENTITLEMENT = 'Futura Pro'
const RC_PRODUCT_ID_MONTHLY = 'monthly'
let purchasesInstance: Purchases | null = null

function getApiKey() {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY
  if (!apiKey) {
    throw new Error('Missing NEXT_PUBLIC_REVENUECAT_API_KEY')
  }
  return apiKey
}

export function getRevenueCatInstance() {
  if (!purchasesInstance) {
    throw new Error('RevenueCat not initialized. Call initRevenueCat(userId) first.')
  }
  return purchasesInstance
}

export async function initRevenueCat(userId: string) {
  if (purchasesInstance) {
    return purchasesInstance
  }

  try {
    purchasesInstance = Purchases.configure({
      apiKey: getApiKey(),
      appUserId: userId
    })
    return purchasesInstance
  } catch (error) {
    console.error('RevenueCat initialization failed', error)
    throw error
  }
}

export async function getCustomerInfo() {
  const purchases = getRevenueCatInstance()
  try {
    return await purchases.getCustomerInfo()
  } catch (error) {
    console.error('Failed to load RevenueCat customer info', error)
    throw error
  }
}

export async function hasFuturaProEntitlement() {
  const customerInfo = await getCustomerInfo()
  return customerInfo.entitlements.active[RC_ENTITLEMENT] !== undefined
}

export async function getOfferings(currency?: string) {
  const purchases = getRevenueCatInstance()
  try {
    return currency ? await purchases.getOfferings({ currency }) : await purchases.getOfferings()
  } catch (error) {
    console.error('Failed to load RevenueCat offerings', error)
    throw error
  }
}

export async function purchasePackage(rcPackage: Package, customerEmail?: string) {
  const purchases = getRevenueCatInstance()
  try {
    return await purchases.purchase({
      rcPackage,
      customerEmail
    })
  } catch (error) {
    console.error('RevenueCat purchase failed', error)
    throw error
  }
}

export async function presentPaywall(htmlTarget: HTMLElement, offeringId?: string) {
  const purchases = getRevenueCatInstance()
  try {
    if (!offeringId) {
      return await purchases.presentPaywall({ htmlTarget })
    }

    const offerings = await getOfferings()
    const offering: Offering | undefined = offerings.all?.[offeringId]
    return await purchases.presentPaywall({ htmlTarget, offering })
  } catch (error) {
    console.error('RevenueCat paywall presentation failed', error)
    throw error
  }
}

export function getEntitlementName() {
  return RC_ENTITLEMENT
}

export function getExpectedProductId() {
  return RC_PRODUCT_ID_MONTHLY
}

export async function validateRevenueCatConfiguration() {
  const offerings = await getOfferings()
  const current = offerings.current
  const productIds = current?.availablePackages?.map((pkg) => pkg.webBillingProduct.identifier) ?? []
  return {
    entitlement: RC_ENTITLEMENT,
    expectedProductId: RC_PRODUCT_ID_MONTHLY,
    hasExpectedProduct: productIds.includes(RC_PRODUCT_ID_MONTHLY),
    currentOfferingId: current?.identifier ?? null,
    productIds
  }
}
