import Purchases from '@revenuecat/purchases-js';

let purchasesInstance = null;

export async function initRevenueCat(userId = null) {
  try {
    purchasesInstance = await Purchases.configure({
      apiKey: process.env.NEXT_PUBLIC_REVENUECAT_API_KEY,
      appUserId: userId || null, // optional (recommended if you have auth)
    });

    console.log('RevenueCat initialized');

    return purchasesInstance;
  } catch (error) {
    console.error('RevenueCat initialization failed:', error);
    throw error;
  }
}

export function getPurchases() {
  if (!purchasesInstance) {
    throw new Error('RevenueCat not initialized');
  }
  return purchasesInstance;
}