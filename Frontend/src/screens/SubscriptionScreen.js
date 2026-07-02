import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentSubscription, getSubscriptionPlans, selectSubscriptionPlan } from '../api/subscription';
import {
  buildRevenueCatPlans,
  configureRevenueCat,
  getRevenueCatOfferings,
  hasActiveEntitlementForPlan,
  hasAnyPremiumEntitlement,
  isPurchaseCancelledError,
  isRevenueCatSupported,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '../api/revenuecat';
import { debugMap } from '../utils/debugMap';

const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://snapngrasp.com/privacy';
const TERMS_OF_USE_URL = process.env.EXPO_PUBLIC_TERMS_URL || 'https://snapngrasp.com/terms';

const PLANS = [
  {
    id: 'free',
    name: 'SNG Free',
    price: '$0',
    period: '',
    tagline: 'Get started for free',
    color: '#6B7280',
    gradientColors: ['#374151', '#1F2937'],
    icon: 'sparkles-outline',
    features: [
      { icon: 'cloud-upload-outline', text: '5 uploads/week', included: true },
      { icon: 'document-outline', text: '5 pages max per upload', included: true },
      { icon: 'flash-outline', text: 'Haiku flashcards & quizzes', included: true },
      { icon: 'image-outline', text: 'No diagrams', included: false },
      { icon: 'mic-outline', text: 'No voice agent', included: false },
      { icon: 'phone-portrait-outline', text: 'Mobile only', included: true },
    ],
    badge: null,
  },
  {
    id: 'pro',
    name: 'SNG Pro',
    price: '$9.99',
    period: '/month',
    tagline: 'For serious learners',
    color: '#6C4CFD',
    gradientColors: ['#6C4CFD', '#4C2FD6'],
    icon: 'rocket-outline',
    features: [
      { icon: 'cloud-upload-outline', text: '10 uploads/day', included: true },
      { icon: 'document-outline', text: '15 pages max per upload', included: true },
      { icon: 'flash-outline', text: 'Smart Haiku/Sonnet routing', included: true },
      { icon: 'image-outline', text: '30 diagrams/month', included: true },
      { icon: 'mic-outline', text: '15 voice minutes/month', included: true },
      { icon: 'phone-portrait-outline', text: 'All platforms', included: true },
    ],
    badge: 'POPULAR',
  },
  {
    id: 'pro_annual',
    name: 'SNG Pro Annual',
    price: '$69.99',
    period: '/year',
    tagline: 'Save 42% - $5.83/mo',
    color: '#10B981',
    gradientColors: ['#10B981', '#059669'],
    icon: 'calendar-outline',
    features: [
      { icon: 'cloud-upload-outline', text: '10 uploads/day', included: true },
      { icon: 'document-outline', text: '15 pages max per upload', included: true },
      { icon: 'flash-outline', text: 'Smart Haiku/Sonnet routing', included: true },
      { icon: 'image-outline', text: '30 diagrams/month', included: true },
      { icon: 'mic-outline', text: '15 voice minutes/month', included: true },
      { icon: 'pricetag-outline', text: 'Save 42% vs monthly', included: true },
    ],
    badge: 'BEST VALUE',
  },
  {
    id: 'pro_plus',
    name: 'SNG Pro+',
    price: '$19.99',
    period: '/month',
    tagline: 'Maximum power',
    color: '#F59E0B',
    gradientColors: ['#F59E0B', '#D97706'],
    icon: 'diamond-outline',
    features: [
      { icon: 'cloud-upload-outline', text: '25 uploads/day', included: true },
      { icon: 'document-outline', text: '30 pages max per upload', included: true },
      { icon: 'flash-outline', text: 'Sonnet for all quizzes', included: true },
      { icon: 'image-outline', text: '80 diagrams/month', included: true },
      { icon: 'mic-outline', text: '45 voice minutes/month', included: true },
      { icon: 'speedometer-outline', text: 'Priority processing', included: true },
    ],
    badge: 'PREMIUM',
  },
];

const AUTO_RENEWAL_TEXT = 'Subscription automatically renews unless canceled at least 24 hours before the end of the current billing period.';

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') {
    return '$0.00';
  }

  const numericValue = Number(String(value).replace(/[^0-9.\-]/g, ''));
  if (Number.isFinite(numericValue)) {
    return `$${numericValue.toFixed(2)}`;
  }

  return String(value).startsWith('$') ? String(value) : `$${value}`;
};

const getBillingPeriodSuffix = (billingPeriod) => {
  if (!billingPeriod || billingPeriod === 'free') {
    return '';
  }

  if (billingPeriod === 'monthly' || billingPeriod === 'month') {
    return 'month';
  }

  if (billingPeriod === 'yearly' || billingPeriod === 'year') {
    return 'year';
  }

  return billingPeriod;
};

const getDurationLabel = (subscriptionLength, billingPeriod) => {
  if (subscriptionLength) {
    return subscriptionLength;
  }

  const normalizedPeriod = (billingPeriod || '').toLowerCase();

  if (normalizedPeriod === 'yearly' || normalizedPeriod === 'year') {
    return '1 Year';
  }

  if (normalizedPeriod === 'monthly' || normalizedPeriod === 'month') {
    return '1 Month';
  }

  if (normalizedPeriod === 'free') {
    return 'Free';
  }

  return billingPeriod || 'Free';
};

const normalizePlanFromApi = (plan, index = 0) => {
  const planId = plan?.id || `plan-${index}`;
  const billingPeriod = plan?.billing_period || (planId === 'free' ? 'free' : 'monthly');
  const price = formatMoney(plan?.price);

  return {
    id: planId,
    name: plan?.plan_name || plan?.name || 'Subscription',
    price,
    billing_period: billingPeriod,
    subscription_length: getDurationLabel(plan?.subscription_length, billingPeriod),
    included_features: Array.isArray(plan?.included_features) ? plan.included_features : [],
    auto_renewal_text: plan?.auto_renewal_text || (billingPeriod === 'free' ? '' : AUTO_RENEWAL_TEXT),
    privacy_policy_url: plan?.privacy_policy_url || PRIVACY_POLICY_URL,
    terms_of_use_url: plan?.terms_of_use_url || TERMS_OF_USE_URL,
    color: PLANS.find((item) => item.id === planId)?.color || '#6C4CFD',
    gradientColors: PLANS.find((item) => item.id === planId)?.gradientColors || ['#6C4CFD', '#4C2FD6'],
    icon: PLANS.find((item) => item.id === planId)?.icon || 'rocket-outline',
    badge: PLANS.find((item) => item.id === planId)?.badge || null,
    tagline: PLANS.find((item) => item.id === planId)?.tagline || '',
  };
};

const formatPriceWithPeriod = (price, billingPeriod) => {
  const suffix = getBillingPeriodSuffix(billingPeriod);
  return suffix ? `${price}/${suffix}` : price;
};

export default function SubscriptionScreen({ navigation, route }) {
  const { theme } = useTheme();
  const isIOS = Platform.OS === 'ios';
  const isRevenueCatIOS = isIOS && isRevenueCatSupported();

  const [selectedPlan, setSelectedPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [offeringPlans, setOfferingPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [iapReady, setIapReady] = useState(!isRevenueCatIOS);
  const [iapMessage, setIapMessage] = useState({ status: 'idle', title: '', message: '' });
  const [restoreLoading, setRestoreLoading] = useState(false);

  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fromSettings = route?.params?.fromSettings || false;
  const existingPlanId = route?.params?.currentPlanId || null;
  const setIsLoggedIn = route?.params?.setIsLoggedIn || null;
  const rootNavigation = navigation.getParent?.() || navigation;

  const goToSubscriptionSuccess = () => {
    rootNavigation.navigate('SubscriptionSuccess', { outcome: 'success' });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    let cancelled = false;

    const loadSubscription = async () => {
      try {
        const current = await getCurrentSubscription();
        if (cancelled) {
          return;
        }

        const subscription = current?.data?.subscription || null;
        setCurrentSubscription(subscription);

        if (subscription?.plan_id) {
          setSelectedPlan(subscription.plan_id);
        } else if (existingPlanId) {
          setSelectedPlan(existingPlanId);
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
        if (existingPlanId) {
          setSelectedPlan(existingPlanId);
        }
      }
    };

    loadSubscription();

    return () => {
      cancelled = true;
    };
  }, [existingPlanId]);

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      try {
        setPlansLoading(true);
        const result = await getSubscriptionPlans();
        if (cancelled) {
          return;
        }

        const plans = result?.data?.plans || [];
        setSubscriptionPlans(plans.map((plan, index) => normalizePlanFromApi(plan, index)));
      } catch (error) {
        console.error('Error loading subscription plans:', error);
        if (!cancelled) {
          setSubscriptionPlans([]);
          setIapMessage({
            status: 'error',
            title: 'Subscription Plans Unavailable',
            message: 'Unable to load subscription details right now. Please try again later.',
          });
        }
      } finally {
        if (!cancelled) {
          setPlansLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRevenueCatIOS) {
      return;
    }

    let active = true;

    const loadOfferings = async () => {
      try {
        setIapMessage({
          status: 'loading',
          title: 'Loading Subscriptions',
          message: 'Fetching the latest plans from App Store via RevenueCat.',
        });

        await configureRevenueCat(currentSubscription?.user_id || null);

        const { currentOffering, availablePackages } = await getRevenueCatOfferings();

        if (!active) {
          return;
        }

        const plans = buildRevenueCatPlans(availablePackages);
        setOfferingPlans(plans);
        setIapReady(true);

        if (!currentOffering || !plans.length) {
          setIapMessage({
            status: 'error',
            title: 'No RevenueCat Offerings',
            message:
              'RevenueCat returned no active packages. Check that an offering is current and products are attached in the RevenueCat dashboard.',
          });
          return;
        }

        setIapMessage({ status: 'idle', title: '', message: '' });
      } catch (error) {
        console.error('RevenueCat offering load failed:', error);
        if (active) {
          setIapReady(true);
          setIapMessage({
            status: 'error',
            title: 'RevenueCat Unavailable',
            message: error?.message || 'Unable to load RevenueCat offerings right now.',
          });
        }
      }
    };

    loadOfferings();

    return () => {
      active = false;
    };
  }, [isRevenueCatIOS, currentSubscription?.user_id]);

  const currentPlan = currentSubscription?.plan_id || existingPlanId || null;

  const visiblePlans = useMemo(() => {
    const rcPlanMap = new Map(offeringPlans.map((plan) => [plan.id, plan]));

    if (!subscriptionPlans.length) {
      return [];
    }

    return subscriptionPlans
      .map((plan) => {
        const rcPlan = rcPlanMap.get(plan.id);
        return {
          ...plan,
          price: rcPlan?.price || plan.price,
          priceWithPeriod: formatPriceWithPeriod(rcPlan?.price || plan.price, plan.billing_period),
          rcPackage: rcPlan?.rcPackage || null,
          productId: rcPlan?.productId || null,
        };
      })
      .filter(Boolean);
  }, [offeringPlans, subscriptionPlans]);

  const getPlanById = (planId) => visiblePlans.find((plan) => plan.id === planId);

  const selectedPlanData = getPlanById(selectedPlan);
  const selectedBillingLabel = getDurationLabel(selectedPlanData?.subscription_length, selectedPlanData?.billing_period);
  const selectedPriceLabel = selectedPlanData?.priceWithPeriod || formatPriceWithPeriod(selectedPlanData?.price || '$0.00', selectedPlanData?.billing_period);
  const paidPlanUnavailable = isRevenueCatIOS && selectedPlan !== 'free' && !selectedPlanData?.rcPackage;

  const handleFreePlanAndContinue = async () => {
    setLoading(true);
    try {
      await selectSubscriptionPlan('free');
      if (setIsLoggedIn) {
        setIsLoggedIn(true);
      } else {
        navigation.replace('Dashboard');
      }
    } catch (e) {
      console.log('Free plan assignment:', e);
      Alert.alert('Error', 'Could not activate the free plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevenueCatSubscribe = async (plan) => {
    if (!plan?.rcPackage) {
      setIapMessage({
        status: 'error',
        title: 'Plan Not Available',
        message:
          'This package is not currently available from RevenueCat. Confirm it is included in the current offering.',
      });
      return;
    }

    setLoading(true);
    setIapMessage({
      status: 'loading',
      title: 'Opening Purchase Sheet',
      message: `Apple will confirm ${plan.name} before activation.`,
    });

    try {
      await configureRevenueCat(currentSubscription?.user_id || null);
      const purchaseResult = await purchaseRevenueCatPackage(plan.rcPackage);
      const customerInfo = purchaseResult?.customerInfo;

      if (!hasActiveEntitlementForPlan(customerInfo, plan.id)) {
        setIapMessage({
          status: 'error',
          title: 'Entitlement Not Active',
          message:
            'Purchase completed but required entitlement is not active yet. Please try Restore Purchases in a moment.',
        });
        return;
      }

      // Navigate to finalization screen which polls the backend for webhook activation
      goToSubscriptionSuccess();
    } catch (error) {
      if (isPurchaseCancelledError(error)) {
        setIapMessage({
          status: 'idle',
          title: '',
          message: '',
        });
        return;
      }

      console.error('RevenueCat purchase failed:', error);
      setIapMessage({
        status: 'error',
        title: 'Purchase Failed',
        message: __DEV__ ? (error?.message || 'Unknown RevenueCat error') : 'Unable to complete purchase. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoreLoading(true);
    setIapMessage({
      status: 'loading',
      title: 'Restoring Purchases',
      message: 'Checking your previous purchases via RevenueCat.',
    });

    try {
      await configureRevenueCat(currentSubscription?.user_id || null);
      const customerInfo = await restoreRevenueCatPurchases();

      if (!hasAnyPremiumEntitlement(customerInfo)) {
        setIapMessage({
          status: 'error',
          title: 'No Purchases Found',
          message: 'No active premium entitlements were found for this Apple account.',
        });
        return;
      }

      // Navigate to finalization screen
      goToSubscriptionSuccess();
    } catch (error) {
      console.error('Restore purchases failed:', error);
      setIapMessage({
        status: 'error',
        title: 'Restore Failed',
        message: __DEV__ ? (error?.message || 'Could not restore purchases.') : 'Could not restore purchases.',
      });
    } finally {
      setRestoreLoading(false);
      setLoading(false);
    }
  };

  const handleSelectPlan = async () => {
    if (!selectedPlanData) {
      Alert.alert('Loading', 'Subscription details are still loading. Please try again in a moment.');
      return;
    }

    if (selectedPlan === currentPlan) {
      if (fromSettings) {
        navigation.goBack();
      } else if (setIsLoggedIn) {
        setIsLoggedIn(true);
      } else {
        navigation.replace('Dashboard');
      }
      return;
    }

    if (selectedPlan === 'free') {
      setLoading(true);
      try {
        const result = await selectSubscriptionPlan('free');
        if (result.status === 'success') {
          const successMsg = fromSettings
            ? { title: 'Plan Updated!', body: 'You are now on SNG Free.' }
            : { title: 'Welcome to SnapNGrasp!', body: 'You are starting with the Free plan.' };

          Alert.alert(successMsg.title, successMsg.body, [{
            text: fromSettings ? 'Great!' : 'Let\'s Go!',
            onPress: () => {
              if (fromSettings) navigation.goBack();
              else if (setIsLoggedIn) setIsLoggedIn(true);
              else navigation.replace('Dashboard');
            },
          }]);
        } else {
          Alert.alert('Error', result.message || 'Failed to select plan');
        }
      } catch (error) {
        console.error('Error selecting free plan:', error);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const plan = getPlanById(selectedPlan);

    if (!isRevenueCatIOS) {
      Alert.alert(
        'iOS Only',
        'Paid subscriptions are currently available only on iPhone and iPad through RevenueCat/App Store.'
      );
      return;
    }

    await handleRevenueCatSubscribe(plan);
  };

  const handleSkip = () => {
    handleFreePlanAndContinue();
  };

  const openExternalLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Unable to Open Link', 'Please try again later.');
    }
  };

  const renderPlanCard = (plan, index) => {
    const safePlan = {
      id: plan?.id || `plan-${index}`,
      name: plan?.name || plan?.title || 'Subscription',
      price: plan?.price || '$0',
      billingPeriod: plan?.billing_period || '',
      subscriptionLength: plan?.subscription_length || '',
      priceWithPeriod: plan?.priceWithPeriod || formatPriceWithPeriod(plan?.price || '$0.00', plan?.billing_period),
      tagline: plan?.tagline || '',
      color: plan?.color || '#6C4CFD',
      gradientColors: Array.isArray(plan?.gradientColors) && plan.gradientColors.length >= 2
        ? plan.gradientColors
        : ['#6C4CFD', '#4C2FD6'],
      icon: plan?.icon || 'rocket-outline',
      badge: plan?.badge || null,
      includedFeatures: Array.isArray(plan?.included_features) ? plan.included_features : [],
      rcPackage: plan?.rcPackage || null,
      productId: plan?.productId || null,
    };

    const isSelected = selectedPlan === safePlan.id;
    const isCurrent = currentPlan === safePlan.id;

    return (
      <Animated.View
        key={safePlan.id}
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.planCard,
            {
              backgroundColor: theme.colors.secondaryBackground,
              borderColor: isSelected ? safePlan.color : theme.colors.border,
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
          onPress={() => setSelectedPlan(safePlan.id)}
          activeOpacity={0.7}
        >
          {safePlan.badge && (
            <View style={[styles.badge, { backgroundColor: safePlan.color }]}>
              <Text style={styles.badgeText}>{safePlan.badge}</Text>
            </View>
          )}

          <View style={styles.planHeader}>
            <LinearGradient
              colors={safePlan.gradientColors}
              style={styles.planIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={safePlan.icon} size={24} color="#FFF" />
            </LinearGradient>
            <View style={styles.planTitleSection}>
              <Text style={[styles.planName, { color: theme.colors.primaryText }]}>
                {safePlan.name}
              </Text>
              <Text style={[styles.planTagline, { color: theme.colors.secondaryText }]}>
                {safePlan.tagline}
              </Text>
              <Text style={[styles.planDuration, { color: theme.colors.secondaryText }]}>
                {safePlan.subscriptionLength}
              </Text>
            </View>
            <View style={styles.priceSection}>
              <Text style={[styles.planPrice, { color: safePlan.color }]}>
                {safePlan.priceWithPeriod}
              </Text>
            </View>
          </View>

          <View style={styles.featuresContainer}>
            {debugMap(safePlan.includedFeatures, `plan-${safePlan.id}-features`, (feature, fIdx) => (
              <View key={fIdx} style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#10B981"
                />
                <Text
                  style={[
                    styles.featureText,
                    {
                      color: theme.colors.primaryText,
                    },
                  ]}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.selectionRow}>
            <View
              style={[
                styles.radioOuter,
                { borderColor: isSelected ? safePlan.color : theme.colors.border },
              ]}
            >
              {isSelected && (
                <View style={[styles.radioInner, { backgroundColor: safePlan.color }]} />
              )}
            </View>
            <Text style={[styles.selectText, { color: isSelected ? safePlan.color : theme.colors.secondaryText }]}>
              {isCurrent ? 'Current Plan' : isSelected ? 'Selected' : 'Select'}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primaryBackground }]}> 
      <StatusBar barStyle={theme.colors.statusBarStyle} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}> 
          {fromSettings && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Subscription</Text>
            <Text style={styles.headerSubtitle}>
              {isRevenueCatIOS ? 'Subscriptions are managed securely by RevenueCat + Apple' : 'Unlock more with SnapNGrasp'}
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.secondaryText }]}>Subscription title</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.primaryText }]}>{selectedPlanData?.name || 'SNG Free'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.secondaryText }]}>Duration</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.primaryText }]}>{selectedBillingLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.secondaryText }]}>Price</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.primaryText }]}>{selectedPriceLabel}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <Text style={[styles.summarySectionTitle, { color: theme.colors.primaryText }]}>Included features</Text>
          <View style={styles.summaryFeaturesContainer}>
            {debugMap(selectedPlanData?.included_features || [], `selected-${selectedPlanData?.id || 'plan'}-features`, (feature, index) => (
              <View key={`${feature}-${index}`} style={styles.summaryFeatureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.summaryFeatureText, { color: theme.colors.primaryText }]}>{feature}</Text>
              </View>
            ))}
          </View>
          {selectedPlanData?.auto_renewal_text ? (
            <Text style={[styles.autoRenewalText, { color: theme.colors.secondaryText }]}>
              {selectedPlanData.auto_renewal_text}
            </Text>
          ) : null}
          <View style={styles.legalLinksInlineRow}>
            <TouchableOpacity onPress={() => openExternalLink(selectedPlanData?.privacy_policy_url || PRIVACY_POLICY_URL)}>
              <Text style={[styles.legalLinkText, { color: theme.colors.secondaryText }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={[styles.legalSeparator, { color: theme.colors.secondaryText }]}>|</Text>
            <TouchableOpacity onPress={() => openExternalLink(selectedPlanData?.terms_of_use_url || TERMS_OF_USE_URL)}>
              <Text style={[styles.legalLinkText, { color: theme.colors.secondaryText }]}>Terms of Use (EULA)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {iapMessage.status !== 'idle' && (
          <View
            style={[
              styles.statusBanner,
              iapMessage.status === 'success'
                ? styles.statusSuccess
                : iapMessage.status === 'error'
                  ? styles.statusError
                  : styles.statusLoading,
            ]}
          >
            <Text style={styles.statusTitle}>{iapMessage.title}</Text>
            <Text style={styles.statusMessage}>{iapMessage.message}</Text>
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {(plansLoading || (!iapReady && isRevenueCatIOS)) ? (
            <View style={styles.loadingPanel}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingPanelText, { color: theme.colors.secondaryText }]}>
                Loading subscription details...
              </Text>
            </View>
          ) : null}

          {debugMap(visiblePlans, 'SubscriptionScreen.visiblePlans', (plan, index) => renderPlanCard(plan, index))}

          <View style={{ height: isRevenueCatIOS ? 260 : 180 }} />
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: theme.colors.primaryBackground, borderTopColor: theme.colors.border }]}> 
          <Text style={[styles.autoRenewalNotice, { color: theme.colors.secondaryText }]}>Subscription automatically renews unless canceled at least 24 hours before the end of the current billing period.</Text>

          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: selectedPlanData?.color || '#6C4CFD' },
            ]}
            onPress={handleSelectPlan}
            disabled={loading || plansLoading || (isRevenueCatIOS && (!iapReady || paidPlanUnavailable))}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.continueButtonText}>
                {selectedPlan === 'free'
                  ? 'Start Free'
                  : currentPlan === selectedPlan
                    ? 'Keep Current Plan'
                    : `Subscribe - ${selectedPriceLabel}`}
              </Text>
            )}
          </TouchableOpacity>

          {isRevenueCatIOS && (
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases} disabled={restoreLoading || loading}>
              {restoreLoading ? (
                <ActivityIndicator color={theme.colors.accent} />
              ) : (
                <Text style={[styles.restoreText, { color: theme.colors.secondaryText }]}>Restore Purchases</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={() => openExternalLink(selectedPlanData?.privacy_policy_url || PRIVACY_POLICY_URL)}>
              <Text style={[styles.legalLinkText, { color: theme.colors.secondaryText }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={[styles.legalSeparator, { color: theme.colors.secondaryText }]}>|</Text>
            <TouchableOpacity onPress={() => openExternalLink(selectedPlanData?.terms_of_use_url || TERMS_OF_USE_URL)}>
              <Text style={[styles.legalLinkText, { color: theme.colors.secondaryText }]}>Terms of Use</Text>
            </TouchableOpacity>
          </View>

          {!fromSettings && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={[styles.skipText, { color: theme.colors.secondaryText }]}>
                Skip for now (Free plan)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.18)',
    marginVertical: 12,
  },
  summarySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryFeaturesContainer: {
    gap: 6,
  },
  summaryFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryFeatureText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  autoRenewalText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
  },
  legalLinksInlineRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 16,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  planIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitleSection: {
    flex: 1,
    marginLeft: 12,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
  },
  planTagline: {
    fontSize: 12,
    marginTop: 2,
  },
  planDuration: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
  },
  planPeriod: {
    fontSize: 11,
    marginTop: 1,
  },
  featuresContainer: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  continueButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  autoRenewalNotice: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  legalLinksRow: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLinkText: {
    fontSize: 12,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  legalSeparator: {
    fontSize: 12,
    marginHorizontal: 8,
  },
  statusBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusLoading: {
    backgroundColor: 'rgba(108, 76, 253, 0.12)',
    borderColor: 'rgba(108, 76, 253, 0.28)',
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 13,
    color: '#FFF',
    lineHeight: 18,
  },
  loadingPanel: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingPanelText: {
    marginTop: 10,
    fontSize: 13,
  },
});
