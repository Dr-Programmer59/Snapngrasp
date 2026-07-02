import { BACKEND_API_URL } from '../config/api';
import { authenticatedFetch } from './http';
const API_URL = `${BACKEND_API_URL}/api`;

/**
 * Get all available subscription plans
 */
export const getSubscriptionPlans = async () => {
  try {
    const response = await fetch(`${API_URL}/subscription/plans`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }
};

/**
 * Get current user's subscription and credits
 */
export const getCurrentSubscription = async () => {
  try {
    const response = await authenticatedFetch(`${API_URL}/subscription/current`, {
      cache: 'no-store',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};

/**
 * Get premium access status derived from backend subscription records
 */
export const getMySubscriptionAccess = async () => {
  try {
    const response = await authenticatedFetch(`${API_URL}/me/subscription`, {
      cache: 'no-store',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching /me/subscription:', error);
    throw error;
  }
};

/**
 * Select/change subscription plan
 */
export const selectSubscriptionPlan = async (planId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/subscription/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error selecting plan:', error);
    throw error;
  }
};

/**
 * Check if user has credits for a specific type
 */
export const checkCredit = async (type) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/subscription/check-credit/${type}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking credit:', error);
    throw error;
  }
};

/**
 * Consume a credit
 */
export const useCredit = async (type, amount = 1) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/subscription/use-credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error using credit:', error);
    throw error;
  }
};
