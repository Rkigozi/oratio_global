import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { ArrowLeft, Bell, Globe2, LogOut, MessageCircle } from 'lucide-react-native';
import {
  getProfilePreferences,
  updateProfilePreferences,
  type ProfilePreferences,
} from '@oratio/shared/queries';
import { asNativeIcon } from '../components/icon';
import { useAuth } from '../hooks/auth-context';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const BellIcon = asNativeIcon(Bell);
const GlobeIcon = asNativeIcon(Globe2);
const LogOutIcon = asNativeIcon(LogOut);
const MessageIcon = asNativeIcon(MessageCircle);

const languages = [
  { value: 'auto', label: 'Auto' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
];

export function SettingsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<ProfilePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    setSaving(true);
    setError('');
    try {
      const ok = await updateProfilePreferences(next);
      if (!ok) {
        setPrefs(previous);
        setError("We couldn't save settings.");
      }
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
          <Text style={styles.title}>SETTINGS</Text>
          <Text style={styles.subtitle}>{saving ? 'Saving...' : 'Profile preferences'}</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

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
            onPress={confirmSignOut}
            style={styles.signOutRow}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  title: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.heading,
    fontSize: 17,
    letterSpacing: 3,
  },
  subtitle: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 2,
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
});
