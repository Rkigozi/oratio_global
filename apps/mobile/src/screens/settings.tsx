import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  CircleHelp,
  ExternalLink,
  FileText,
  Globe2,
  HeartHandshake,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  Trash2,
} from 'lucide-react-native';
import {
  deleteAccount,
  getProfilePreferences,
  updateProfilePreferences,
  type ProfilePreferences,
} from '@oratio/shared/queries';
import { TRANSLATION_LANGUAGE_OPTIONS } from '@oratio/shared/translation';
import { asNativeIcon } from '../components/icon';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { useAuth } from '../hooks/auth-context';
import { useTheme, type ThemeMode } from '../hooks/theme-context';
import { ORATIO_EXTERNAL_LINKS } from '../services/external-links';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const BellIcon = asNativeIcon(Bell);
const CircleHelpIcon = asNativeIcon(CircleHelp);
const ExternalLinkIcon = asNativeIcon(ExternalLink);
const FileTextIcon = asNativeIcon(FileText);
const GlobeIcon = asNativeIcon(Globe2);
const HeartHandshakeIcon = asNativeIcon(HeartHandshake);
const LogOutIcon = asNativeIcon(LogOut);
const MessageIcon = asNativeIcon(MessageCircle);
const MonitorIcon = asNativeIcon(Monitor);
const MoonIcon = asNativeIcon(Moon);
const PaletteIcon = asNativeIcon(Palette);
const ShieldIcon = asNativeIcon(Shield);
const SunIcon = asNativeIcon(Sun);
const TrashIcon = asNativeIcon(Trash2);

const appearanceOptions: Array<{
  value: ThemeMode;
  label: string;
  icon: ReturnType<typeof asNativeIcon>;
}> = [
  { value: 'system', label: 'System', icon: MonitorIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
];

const languages = [{ value: 'auto', label: 'Auto' }, ...TRANSLATION_LANGUAGE_OPTIONS];

export function SettingsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  const { user, signOut } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const [prefs, setPrefs] = useState<ProfilePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setPrefs(await getProfilePreferences());
    } catch {
      setError("We couldn't load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const update = async (next: Partial<ProfilePreferences>) => {
    if (!prefs || saving) return;
    const previous = prefs;
    const previousThemeMode = themeMode;
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    if (next.theme) setThemeMode(next.theme);
    setSaving(true);
    setError('');
    try {
      const ok = await updateProfilePreferences(next);
      if (!ok) {
        setPrefs(previous);
        if (next.theme) setThemeMode(previousThemeMode);
        setError("We couldn't save settings.");
      }
    } catch {
      setPrefs(previous);
      if (next.theme) setThemeMode(previousThemeMode);
      setError("We couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can sign in again with your email and password.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  const deleteAccountPermanently = async () => {
    if (deleting) return;
    setDeleting(true);

    const deleteError = await deleteAccount();
    if (deleteError) {
      setDeleting(false);
      const message =
        deleteError === 'Not authenticated'
          ? 'Your session has expired. Sign in again before deleting your account.'
          : deleteError;
      Alert.alert(
        'Account not deleted',
        `${message}\n\nYour local session has not been cleared, so you can check your connection and try again.`
      );
      return;
    }

    await signOut().catch(() => {});
  };

  const confirmPermanentDeletion = () => {
    Alert.alert(
      'Delete account forever?',
      'This cannot be undone. Your account and associated Oratio data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () => void deleteAccountPermanently(),
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'Your prayers, comments, Prayer Circle connections, saved prayers, profile, and account will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: confirmPermanentDeletion },
      ]
    );
  };

  const openExternalLink = async (label: string, url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Unable to open ${label}`, `Please visit ${url} in your browser.`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.dim}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <ArrowLeftIcon color={colors.textSecondary} size={20} strokeWidth={1.7} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenHeaderTitle
            subtitle={
              deleting ? 'Deleting account...' : saving ? 'Saving...' : 'Profile preferences'
            }
            title="Settings"
          />
        </View>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.section}>
          <SectionTitle
            icon={<PaletteIcon color={colors.textDim} size={15} />}
            label="Appearance"
          />
          <View accessibilityRole="radiogroup" style={styles.appearanceControl}>
            {appearanceOptions.map(({ value, label, icon: Icon }) => {
              const selected = themeMode === value;
              return (
                <Pressable
                  accessibilityLabel={`${label} appearance`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={value}
                  onPress={() => void update({ theme: value })}
                  style={[styles.appearanceOption, selected && styles.appearanceOptionSelected]}
                >
                  <Icon
                    color={selected ? colors.accent : colors.textDim}
                    size={16}
                    strokeWidth={1.7}
                  />
                  <Text
                    style={[
                      styles.appearanceOptionText,
                      selected && styles.appearanceOptionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle icon={<BellIcon color={colors.textDim} size={15} />} label="Updates" />
          <ToggleRow
            label="Prayers offered"
            value={prefs?.notify_on_prayed ?? true}
            onValueChange={(value) => void update({ notify_on_prayed: value })}
          />
          <ToggleRow
            label="Comments and replies"
            value={prefs?.notify_on_comment ?? true}
            onValueChange={(value) => void update({ notify_on_comment: value })}
          />
        </View>

        <View style={styles.section}>
          <SectionTitle
            icon={<MessageIcon color={colors.textDim} size={15} />}
            label="Prayer Defaults"
          />
          <ToggleRow
            label="Allow comments on new public prayers"
            value={prefs?.comments_enabled_default ?? true}
            onValueChange={(value) => void update({ comments_enabled_default: value })}
          />
        </View>

        <View style={styles.section}>
          <SectionTitle icon={<GlobeIcon color={colors.textDim} size={15} />} label="Translation" />
          <View style={styles.languageGrid}>
            {languages.map((language) => {
              const selected = (prefs?.language ?? 'auto') === language.value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={language.value}
                  onPress={() => void update({ language: language.value })}
                  style={[styles.languageButton, selected && styles.languageButtonSelected]}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      selected && styles.languageButtonTextSelected,
                    ]}
                  >
                    {language.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle
            icon={<ShieldIcon color={colors.textDim} size={15} />}
            label="Support & legal"
          />
          <ExternalLinkRow
            icon={<CircleHelpIcon color={colors.textDim} size={17} />}
            label="Help with Oratio"
            onPress={() => void openExternalLink('Oratio support', ORATIO_EXTERNAL_LINKS.help)}
            subtitle="Account, privacy, and app guidance"
          />
          <ExternalLinkRow
            icon={<ShieldIcon color={colors.textDim} size={17} />}
            label="Privacy policy"
            onPress={() => void openExternalLink('Privacy policy', ORATIO_EXTERNAL_LINKS.privacy)}
            subtitle="How Oratio handles your information"
          />
          <ExternalLinkRow
            icon={<FileTextIcon color={colors.textDim} size={17} />}
            label="Terms of service"
            onPress={() => void openExternalLink('Terms of service', ORATIO_EXTERNAL_LINKS.terms)}
            subtitle="The terms for using Oratio"
          />
          <ExternalLinkRow
            icon={<HeartHandshakeIcon color={colors.accent} size={18} />}
            label="Safety & crisis support"
            onPress={() =>
              void openExternalLink('Safety and crisis support', ORATIO_EXTERNAL_LINKS.support)
            }
            subtitle="Find confidential support in your country"
          />
          <Text style={styles.safetyNote}>
            Oratio is not an emergency service. If someone is in immediate danger, contact local
            emergency services.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionTitle icon={<LogOutIcon color={colors.textDim} size={15} />} label="Account" />
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text numberOfLines={1} style={styles.accountValue}>
              {user?.email || 'Not available'}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            disabled={deleting}
            onPress={confirmSignOut}
            style={[styles.signOutRow, deleting && styles.disabled]}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Delete account"
            accessibilityRole="button"
            disabled={deleting}
            onPress={confirmDeleteAccount}
            style={({ pressed }) => [
              styles.deleteRow,
              pressed && styles.deleteRowPressed,
              deleting && styles.disabled,
            ]}
          >
            <View style={styles.deleteIcon}>
              {deleting ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <TrashIcon color={colors.danger} size={17} strokeWidth={1.7} />
              )}
            </View>
            <View style={styles.linkCopy}>
              <Text style={styles.deleteLabel}>
                {deleting ? 'Deleting account...' : 'Delete account'}
              </Text>
              <Text style={styles.deleteSubtitle}>Permanently remove your account and data</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExternalLinkRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
    >
      <View style={styles.linkIcon}>{icon}</View>
      <View style={styles.linkCopy}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkSubtitle}>{subtitle}</Text>
      </View>
      <ExternalLinkIcon color={colors.textDim} size={15} strokeWidth={1.7} />
    </Pressable>
  );
}

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon}
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        ios_backgroundColor={colors.surfaceHover}
        onValueChange={onValueChange}
        thumbColor={colors.white}
        trackColor={{ false: colors.surfaceHover, true: colors.accentDark }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    minHeight: 70,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  dim: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 18,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  sectionTitleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  appearanceControl: {
    minHeight: 48,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  appearanceOption: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 6,
  },
  appearanceOptionSelected: {
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  appearanceOptionText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
  },
  appearanceOptionTextSelected: {
    color: colors.accent,
  },
  toggleRow: {
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    flex: 1,
    paddingRight: 14,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
  },
  languageButton: {
    minHeight: 44,
    minWidth: 92,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  languageButtonSelected: {
    backgroundColor: colors.accentDark,
    borderColor: colors.accentDark,
  },
  languageButtonText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
  languageButtonTextSelected: {
    color: colors.white,
  },
  linkRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  linkRowPressed: {
    backgroundColor: colors.accentTintSoft,
  },
  linkIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCopy: {
    flex: 1,
    minWidth: 0,
  },
  linkLabel: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  linkSubtitle: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  safetyNote: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 17,
    paddingTop: 12,
  },
  signOutRow: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    justifyContent: 'center',
  },
  accountRow: {
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    justifyContent: 'center',
    gap: 3,
  },
  accountLabel: {
    color: colors.textDim,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  accountValue: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  signOutText: {
    color: colors.danger,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  deleteRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
  },
  deleteRowPressed: {
    backgroundColor: colors.dangerTint,
  },
  deleteIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    color: colors.danger,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  deleteSubtitle: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.55,
  },
});
