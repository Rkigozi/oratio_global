import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.brandBlock}>
      <Text style={styles.brand}>ORATIO</Text>
      {subtitle ? <Text style={styles.brandSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: boolean }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.field, error ? styles.fieldError : null]}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function LinkButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.linkButton}>
      <Text style={styles.linkText}>{title}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function InfoText({ children }: { children: ReactNode }) {
  return <Text style={styles.info}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  brand: {
    color: colors.textSecondary,
    fontSize: 30,
    fontWeight: '300',
    letterSpacing: 8,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  field: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 14,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    textAlign: 'center',
  },
  fieldError: {
    borderColor: colors.danger,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  linkText: {
    color: colors.accent,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  info: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
