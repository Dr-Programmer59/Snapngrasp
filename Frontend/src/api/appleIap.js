import { Platform } from 'react-native';
import { BACKEND_API_URL } from '../config/api';
import { authenticatedFetch } from './http';

const MONTHLY_PRODUCT_ID = process.env.EXPO_PUBLIC_APPLE_IAP_MONTHLY_PRODUCT_ID || 'com.snapngrasp.pro.monthly';
const YEARLY_PRODUCT_ID = process.env.EXPO_PUBLIC_APPLE_IAP_YEARLY_PRODUCT_ID || 'com.snapngrasp.pro.yearly';
const PRO_PLUS_MONTHLY_PRODUCT_ID = process.env.EXPO_PUBLIC_APPLE_IAP_PRO_PLUS_MONTHLY_PRODUCT_ID || 'com.snapngrasp.proplus.monthly';

export const APPLE_IOS_SUBSCRIPTION_PRODUCTS = [
  {
    id: 'pro',
    productId: MONTHLY_PRODUCT_ID,
    title: 'SNG Pro',
    fallbackPrice: '$9.99',
    fallbackPeriod: '/month',
    durationLabel: '1 month',
    badge: 'POPULAR',
  },
  {
    id: 'pro_annual',
    productId: YEARLY_PRODUCT_ID,
    title: 'SNG Pro Annual',
    fallbackPrice: '$69.99',
    fallbackPeriod: '/year',
    durationLabel: '1 year',
    badge: 'BEST VALUE',
  },
  {
    id: 'pro_plus',
    productId: PRO_PLUS_MONTHLY_PRODUCT_ID,
    title: 'SNG Pro+',
    fallbackPrice: '$19.99',
    fallbackPeriod: '/month',
    durationLabel: '1 month',
    badge: 'PREMIUM',
  },
];

const toDurationLabel = (product) => {
  const periodNumber = product?.subscriptionPeriodNumberIOS || product?.subscriptionPeriod?.numberOfUnits;
  const periodUnit = (product?.subscriptionPeriodUnitIOS || product?.subscriptionPeriod?.unit || '').toString().toLowerCase();

  if (!periodNumber || !periodUnit) {
    return null;
  }

  const unitLabel = periodNumber === 1 ? periodUnit : `${periodUnit}s`;
  return `${periodNumber} ${unitLabel}`;
};

export const buildIosSubscriptionPlans = (appleProducts = []) => {
  const planUiDefaults = {
    pro: {
      color: '#6C4CFD',
      gradientColors: ['#6C4CFD', '#4C2FD6'],
      icon: 'rocket-outline',
      tagline: 'For serious learners',
    },
    pro_annual: {
      color: '#10B981',
      gradientColors: ['#10B981', '#059669'],
      icon: 'calendar-outline',
      tagline: 'Save 42% — $5.83/mo',
    },
    pro_plus: {
      color: '#F59E0B',
      gradientColors: ['#F59E0B', '#D97706'],
      icon: 'diamond-outline',
      tagline: 'Maximum power',
    },
  };

  return APPLE_IOS_SUBSCRIPTION_PRODUCTS.map((plan) => {
    const appleProduct = appleProducts.find((item) => item.productId === plan.productId || item.productIdIOS === plan.productId);
    const uiDefaults = planUiDefaults[plan.id] || {};

    return {
      ...plan,
      color: uiDefaults.color || '#6C4CFD',
      gradientColors: uiDefaults.gradientColors || ['#6C4CFD', '#4C2FD6'],
      icon: uiDefaults.icon || 'rocket-outline',
      tagline: uiDefaults.tagline || plan.title,
      name: appleProduct?.localizedTitle || appleProduct?.title || plan.title,
      price: appleProduct?.localizedPrice || appleProduct?.price || plan.fallbackPrice,
      period: toDurationLabel(appleProduct) || plan.fallbackPeriod,
      description: appleProduct?.description || '',
      appleProduct,
    };
  });
};

export const verifyAppleSubscription = async ({
  userId,
  platform = Platform.OS,
  productId,
  transactionId,
  receipt,
  restore = false,
}) => {
  const response = await authenticatedFetch(`${BACKEND_API_URL}/api/iap/apple/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      platform,
      productId,
      transactionId,
      receipt,
      restore,
    }),
  });

  return response.json();
};
