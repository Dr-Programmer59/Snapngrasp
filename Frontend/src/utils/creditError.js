import { Alert } from 'react-native';

/**
 * Check if an API response is a credit limit error (403).
 * If so, show an upgrade popup and return true. Otherwise return false.
 * 
 * Usage in API layer:
 *   const data = await response.json();
 *   if (handleCreditError(response, data, navigation)) return null;
 */
export const isCreditError = (response) => {
  return response?.status === 403;
};

/**
 * Show a credit limit popup with option to upgrade.
 * @param {object} data - The error response data from the backend
 * @param {object} navigation - React Navigation object (optional, for upgrade flow)
 */
export const showCreditLimitPopup = (data, navigation) => {
  const code = data?.code;
  const creditType = data?.creditType || '';
  const used = data?.used;
  const limit = data?.limit;

  let title = 'Credit Limit Reached';
  let message = data?.message || 'You have used all your credits for this period.';

  if (code === 'CREDIT_UNAVAILABLE') {
    title = 'Feature Not Available';
    message = `${formatCreditType(creditType)} are not included in your current plan.`;
  } else if (code === 'CREDIT_EXHAUSTED') {
    title = `${formatCreditType(creditType)} Limit Reached`;
    message = `You've used ${used}/${limit} ${creditType.replace('_', ' ')} this period. Upgrade for more!`;
  }

  const buttons = [
    { text: 'OK', style: 'cancel' },
  ];

  if (navigation) {
    buttons.push({
      text: 'Upgrade Plan',
      onPress: () => navigation.navigate('SubscriptionScreen', { fromSettings: true }),
    });
  }

  Alert.alert(title, message, buttons);
};

/**
 * Combined: check response + show popup. Returns true if it was a credit error.
 */
export const handleCreditError = (response, data, navigation) => {
  if (response?.status === 403 && (data?.code === 'CREDIT_EXHAUSTED' || data?.code === 'CREDIT_UNAVAILABLE')) {
    showCreditLimitPopup(data, navigation);
    return true;
  }
  return false;
};

function formatCreditType(type) {
  switch (type) {
    case 'uploads': return 'Uploads';
    case 'diagrams': return 'Diagrams';
    case 'voice_minutes': return 'Voice Minutes';
    default: return type?.replace('_', ' ') || 'Credits';
  }
}
