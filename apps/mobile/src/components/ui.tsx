import { useState, type ReactNode } from 'react';
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
import { Eye, EyeOff } from 'lucide-react-native';
import { asNativeIcon } from './icon';
import { colors, fontFamilies, radii } from '../theme';

const EyeIcon = asNativeIcon(Eye);
const EyeOffIcon = asNativeIcon(EyeOff);

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

export function PasswordField({
  label,
  error,
  ...props
}: Omit<TextInputProps, 'secureTextEntry'> & { label: string; error?: boolean }) {
  const [visible, setVisible] = useState(false);
  const VisibilityIcon = visible ? EyeOffIcon : EyeIcon;

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.passwordShell, error ? styles.fieldError : null]}>
        <TextInput
          placeholderTextColor={colors.textDim}
          secureTextEntry={!visible}
          style={styles.passwordInput}
          {...props}
        />
        <Pressable
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setVisible((current) => !current)}
          style={styles.visibilityButton}
        >
          <VisibilityIcon color={colors.textMuted} size={19} strokeWidth={1.7} />
        </Pressable>
      </View>
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
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        pressed && !(disabled || loading) && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
      ]}
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
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.linkButton}>
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
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  brand: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.heading,
    fontSize: 30,
    letterSpacing: 8,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
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
    borderRadius: radii.control,
    color: colors.text,
    paddingHorizontal: 16,
    minHeight: 50,
    paddingVertical: 13,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    textAlign: 'center',
  },
  fieldError: {
    borderColor: colors.danger,
  },
  passwordShell: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.control,
  },
  passwordInput: {
    flex: 1,
    minHeight: 48,
    paddingLeft: 52,
    paddingRight: 8,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    textAlign: 'center',
  },
  visibilityButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 50,
    backgroundColor: colors.accentDark,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    backgroundColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 15,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  linkText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  info: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
