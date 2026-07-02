import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentSubscription } from '../api/subscription';

export default function SubscriptionReturnScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Finalizing Subscription');
  const [message, setMessage] = useState('Please wait while we confirm your subscription.');

  const outcome = useMemo(() => route?.params?.outcome || 'pending', [route?.params?.outcome]);
  const isSuccess = route?.name === 'SubscriptionSuccess' && outcome === 'success';

  useEffect(() => {
    let cancelled = false;

    const finalize = async () => {
      if (!isSuccess) {
        setTitle('Subscription Pending');
        setMessage('The purchase was received, but activation is still syncing. Please wait a moment and tap Continue.');
        setLoading(false);
        return;
      }

      let activated = false;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const current = await getCurrentSubscription();
          const sub = current?.data?.subscription;
          if (sub?.status === 'active' || sub?.status === 'canceling') {
            activated = true;
            break;
          }
        } catch (_) {
          // Webhook may still be processing; retry briefly.
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (cancelled) {
        return;
      }

      if (activated) {
        setTitle('Subscription Active');
        setMessage('Purchase confirmed. Your plan is now active.');
        if (!isLoggedIn) {
          setIsLoggedIn(true);
        }
      } else {
        setTitle('Subscription Pending');
        setMessage('Purchase succeeded but activation is still processing. Please check again in a moment.');
      }

      setLoading(false);
    };

    finalize();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isSuccess, setIsLoggedIn]);

  const continueToApp = () => {
    if (isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainAppStack' }],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'AuthStack' }],
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primaryBackground }]}> 
      <View style={[styles.card, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}> 
        {loading ? <ActivityIndicator size="large" color={theme.colors.accent} style={styles.loader} /> : null}
        <Text style={[styles.title, { color: theme.colors.primaryText }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.colors.secondaryText }]}>{message}</Text>

        {!loading ? (
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.accent }]} onPress={continueToApp}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  loader: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  button: {
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
