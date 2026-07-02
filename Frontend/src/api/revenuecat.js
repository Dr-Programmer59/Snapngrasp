import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';

const IOS_PUBLIC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';

const MONTHLY_PRODUCT_ID = process.env.EXPO_PUBLIC_APPLE_IAP_MONTHLY_PRODUCT_ID || 'com.snapngrasp.pro.monthly';
const YEARLY_PRODUCT_ID = process.env.EXPO_PUBLIC_APPLE_IAP_YEARLY_PRODUCT_ID || 'com.snapngrasp.pro.yearly';
const PRO_PLUS_MONTHLY_PRODUCT_ID = process.env.EXPO_PUBLIC_APPLE_IAP_PRO_PLUS_MONTHLY_PRODUCT_ID || 'com.snapngrasp.proplus.monthly';

const ENTITLEMENT_PRO = process.env.EXPO_PUBLIC_RC_ENTITLEMENT_PRO || 'pro';
const ENTITLEMENT_PRO_PLUS = process.env.EXPO_PUBLIC_RC_ENTITLEMENT_PRO_PLUS || 'pro_plus';

const PRODUCT_PLAN_MAP = {
  [MONTHLY_PRODUCT_ID]: 'pro',
  [YEARLY_PRODUCT_ID]: 'pro_annual',
  [PRO_PLUS_MONTHLY_PRODUCT_ID]: 'pro_plus',
};

const PLAN_UI_DEFAULTS = {
  pro: {
    name: 'SNG Pro',
    color: '#6C4CFD',
    gradientColors: ['#6C4CFD', '#4C2FD6'],
    icon: 'rocket-outline',
    tagline: 'For serious learners',
    badge: 'POPULAR',
  },
  pro_annual: {
    name: 'SNG Pro Annual',
    color: '#10B981',
    gradientColors: ['#10B981', '#059669'],
    icon: 'calendar-outline',
    tagline: 'Save 42% — $5.83/mo',
    badge: 'BEST VALUE',
  },
  pro_plus: {
    name: 'SNG Pro+',
    color: '#F59E0B',
    gradientColors: ['#F59E0B', '#D97706'],
    icon: 'diamond-outline',
    tagline: 'Maximum power',
    badge: 'PREMIUM',
  },
};

let configured = false;
let configuredUserId = null;

const getPeriodLabel = (product) => {
  const period = product?.subscriptionPeriod;
  if (!period) {
    return '';
  }

  const units = period?.numberOfUnits || period?.value || 1;
  const rawUnit = (period?.unit || period?.unitType || '').toString().toLowerCase();

  if (rawUnit.includes('year')) {
    return units > 1 ? `/ ${units} years` : '/year';
  }
  if (rawUnit.includes('month')) {
    return units > 1 ? `/ ${units} months` : '/month';
  }
  if (rawUnit.includes('week')) {
    return units > 1 ? `/ ${units} weeks` : '/week';
  }
  if (rawUnit.includes('day')) {
    return units > 1 ? `/ ${units} days` : '/day';
  }

  return '';
};

export const isRevenueCatSupported = () => Platform.OS === 'ios';

export const getRevenueCatConfigError = () => {
  if (!isRevenueCatSupported()) {
    return 'RevenueCat purchases are only enabled on iOS in this build.';
  }

  if (!IOS_PUBLIC_API_KEY) {
    return 'Missing EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in app environment.';
  }

  return null;
};

export const configureRevenueCat = async (appUserID) => {
  const configError = getRevenueCatConfigError();
  if (configError) {
    throw new Error(configError);
  }

  if (!configured) {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({
      apiKey: IOS_PUBLIC_API_KEY,
      appUserID: appUserID || undefined,
    });

    configured = true;
    configuredUserId = appUserID || null;
    return;
  }

  if (appUserID && configuredUserId !== appUserID) {
    await Purchases.logIn(appUserID);
    configuredUserId = appUserID;
    return;
  }

  if (!appUserID && configuredUserId) {
    await Purchases.logOut();
    configuredUserId = null;
  }
};

export const getRevenueCatOfferings = async () => {
  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings?.current || null;
  const availablePackages = Array.isArray(currentOffering?.availablePackages)
    ? currentOffering.availablePackages
    : [];

  return {
    offerings,
    currentOffering,
    availablePackages,
  };
};

export const buildRevenueCatPlans = (availablePackages = []) => {
  return availablePackages
    .map((pkg) => {
      const product = pkg?.product;
      const productId = product?.identifier;
      const planId = PRODUCT_PLAN_MAP[productId];

      if (!planId) {
        return null;
      }

      const defaults = PLAN_UI_DEFAULTS[planId] || {};
      return {
        id: planId,
        name: product?.title || defaults.name || 'Subscription',
        price: product?.priceString || '$0',
        period: getPeriodLabel(product),
        tagline: defaults.tagline || '',
        color: defaults.color || '#6C4CFD',
        gradientColors: defaults.gradientColors || ['#6C4CFD', '#4C2FD6'],
        icon: defaults.icon || 'rocket-outline',
        badge: defaults.badge || null,
        productId,
        rcPackage: pkg,
      };
    })
    .filter(Boolean);
};

export const purchaseRevenueCatPackage = async (pkg) => Purchases.purchasePackage(pkg);

export const restoreRevenueCatPurchases = async () => Purchases.restorePurchases();

export const isPurchaseCancelledError = (error) => {
  return (
    error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    error?.userCancelled === true ||
    /cancel/i.test(error?.message || '')
  );
};

export const hasActiveEntitlementForPlan = (customerInfo, planId) => {
  const active = customerInfo?.entitlements?.active || {};
  const expectedEntitlement = planId === 'pro_plus' ? ENTITLEMENT_PRO_PLUS : ENTITLEMENT_PRO;

  return Boolean(active[expectedEntitlement]);
};

export const hasAnyPremiumEntitlement = (customerInfo) => {
  const active = customerInfo?.entitlements?.active || {};
  return Boolean(active[ENTITLEMENT_PRO] || active[ENTITLEMENT_PRO_PLUS]);
};
