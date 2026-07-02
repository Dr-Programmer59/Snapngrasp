import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Sentry from '@sentry/react-native';

const SHOW_ERROR_DETAILS_IN_BUILDS = true;
// Keep true while debugging phone builds.
// Change to false before releasing to real users.

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  screenName?: string;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: unknown;
  errorName: string;
  errorMessage: string;
  jsStack: string;
  componentStack: string;
  sentryEventId: string | null;
  occurredAt: string;
}

const emptyState: State = {
  hasError: false,
  error: null,
  errorName: '',
  errorMessage: '',
  jsStack: '',
  componentStack: '',
  sentryEventId: null,
  occurredAt: '',
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = emptyState;

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      error,
      errorName: getErrorName(error),
      errorMessage: getErrorMessage(error),
      jsStack: getErrorStack(error),
      componentStack: '',
      sentryEventId: null,
      occurredAt: new Date().toISOString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentStack = errorInfo.componentStack || '';

    console.error('ErrorBoundary caught error:', error);
    console.error('React component stack:', componentStack);

    let sentryEventId: string | null = null;

    try {
      sentryEventId =
        Sentry.captureException(error, {
          tags: {
            screenName: this.props.screenName || 'unknown',
          },
          contexts: {
            react: {
              componentStack,
            },
          },
          extra: {
            screenName: this.props.screenName,
            jsStack: error.stack,
            componentStack,
          },
        }) || null;
    } catch (sentryError) {
      console.error('Sentry capture failed:', sentryError);
    }

    this.setState({
      componentStack,
      sentryEventId,
    });
  }

  handleReset = () => {
    this.setState(emptyState);
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const showDetails =
      this.props.showDetails ?? SHOW_ERROR_DETAILS_IN_BUILDS;

    if (!showDetails && this.props.fallback) {
      return this.props.fallback;
    }

    const likelyPlace = getLikelyPlace(
      this.state.jsStack,
      this.state.componentStack
    );

    const isMapProblem = isProbablyMapProblem(
      this.state.errorMessage,
      this.state.jsStack
    );

    const fullReport = createFullReport({
      state: this.state,
      screenName: this.props.screenName,
      likelyPlace,
    });

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>App crashed here</Text>

          {isMapProblem && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>
                Possible .map() problem
              </Text>
              <Text style={styles.warningText}>
                Something is calling .map() on undefined or null. Check the
                component/file shown below under "Likely place".
              </Text>
            </View>
          )}

          <View style={styles.summaryCard}>
            <InfoRow label="Screen / route" value={this.props.screenName || 'Not passed'} />
            <InfoRow label="Error" value={this.state.errorMessage || 'Unknown error'} />
            <InfoRow label="Likely place" value={likelyPlace || 'Not available'} />
            <InfoRow label="Sentry event id" value={this.state.sentryEventId || 'Not captured'} />
            <InfoRow label="Time" value={this.state.occurredAt || 'Unknown'} />
          </View>

          {showDetails ? (
            <>
              <DetailSection
                title="Full error report"
                value={fullReport}
              />

              <DetailSection
                title="JavaScript stack"
                value={this.state.jsStack}
              />

              <DetailSection
                title="React component stack"
                value={this.state.componentStack}
              />

              <DetailSection
                title="Raw error object"
                value={safeStringify(this.state.error)}
              />
            </>
          ) : (
            <Text style={styles.userMessage}>
              Something went wrong. Please try again.
            </Text>
          )}

          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function DetailSection({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.stackTrace}>
      <Text style={styles.stackTitle}>{title}</Text>
      <Text selectable style={styles.stackText}>
        {value}
      </Text>
    </View>
  );
}

function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name || 'Error';
  }

  if (isRecord(error) && typeof error.name === 'string') {
    return error.name;
  }

  return 'Unknown error type';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || 'No error message';
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  return String(error);
}

function getErrorStack(error: unknown): string {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  if (isRecord(error) && typeof error.stack === 'string') {
    return error.stack;
  }

  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProbablyMapProblem(message: string, stack: string): boolean {
  const text = `${message}\n${stack}`.toLowerCase();

  return (
    text.includes('map') &&
    (text.includes('undefined') ||
      text.includes('null') ||
      text.includes('cannot read property') ||
      text.includes('is not a function'))
  );
}

function getLikelyPlace(jsStack: string, componentStack: string): string {
  const jsLine = getFirstUsefulStackLine(jsStack);

  if (jsLine) {
    return jsLine;
  }

  const componentLine = getFirstUsefulComponentLine(componentStack);

  if (componentLine) {
    return componentLine;
  }

  return '';
}

function getFirstUsefulStackLine(stack: string): string {
  const ignoredWords = [
    'node_modules',
    'react-native',
    'expo-router',
    '@sentry',
    'errorboundary',
    'renderwithhooks',
    'updatefunctioncomponent',
    'beginwork',
    'performunitofwork',
    'workloopsync',
    'commitroot',
    'global code',
  ];

  const lines = stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const usefulLine = lines.find((line) => {
    const lower = line.toLowerCase();

    if (lower.startsWith('typeerror:')) {
      return false;
    }

    return !ignoredWords.some((word) => lower.includes(word));
  });

  return usefulLine || '';
}

function getFirstUsefulComponentLine(componentStack: string): string {
  const lines = componentStack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const usefulLine = lines.find((line) => {
    const lower = line.toLowerCase();

    return (
      !lower.includes('errorboundary') &&
      !lower.includes('suspense') &&
      !lower.includes('anonymous')
    );
  });

  return usefulLine || '';
}

function createFullReport({
  state,
  screenName,
  likelyPlace,
}: {
  state: State;
  screenName?: string;
  likelyPlace: string;
}): string {
  return [
    `Screen / route:\n${screenName || 'Not passed'}`,
    `Likely place:\n${likelyPlace || 'Not available'}`,
    `Error name:\n${state.errorName || 'Unknown'}`,
    `Error message:\n${state.errorMessage || 'Unknown error'}`,
    `Sentry event id:\n${state.sentryEventId || 'Not captured'}`,
    `Time:\n${state.occurredAt || 'Unknown'}`,
    `Map problem detected:\n${
      isProbablyMapProblem(state.errorMessage, state.jsStack) ? 'Yes' : 'No'
    }`,
  ].join('\n\n-------------------------\n\n');
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify(
      {
        name: value.name,
        message: value.message,
        stack: value.stack,
        cause: safeUnknown((value as Error & { cause?: unknown }).cause),
      },
      null,
      2
    );
  }

  try {
    const seen = new WeakSet<object>();

    return (
      JSON.stringify(
        value,
        (_key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
              return '[Circular]';
            }

            seen.add(val);
          }

          return val;
        },
        2
      ) || String(value)
    );
  } catch {
    return String(value);
  }
}

function safeUnknown(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  return value;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    color: '#111827',
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9A3412',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    color: '#7C2D12',
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  userMessage: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
    textAlign: 'center',
  },
  stackTrace: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  stackTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    color: '#111827',
  },
  stackText: {
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    color: '#111827',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#6C63FF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
