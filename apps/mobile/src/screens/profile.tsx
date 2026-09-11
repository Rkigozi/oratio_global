import { useCallback, useMemo, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check, Settings, X } from 'lucide-react-native';
import { validateProfile } from '@oratio/shared/validation';
import { getMyPrayers, getMyProfile, updateProfile } from '@oratio/shared/queries';
import { Avatar } from '../components/avatar';
import { asNativeIcon } from '../components/icon';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { useAuth } from '../hooks/auth-context';
import { chooseAndUploadAvatar } from '../services/avatar-upload';
import { colors, fontFamilies, radii } from '../theme';
import type { RootStackParamList } from '../navigation';

type ProfileDetails = Awaited<ReturnType<typeof getMyProfile>>;
type ProfileStats = { public: number; circle: number; private: number };

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const CameraIcon = asNativeIcon(Camera);
const CheckIcon = asNativeIcon(Check);
const SettingsIcon = asNativeIcon(Settings);
const XIcon = asNativeIcon(X);

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails>(null);
  const [stats, setStats] = useState<ProfileStats>({ public: 0, circle: 0, private: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  const name = profile?.display_name || profile?.username || 'Friend';
  const accountSince = useMemo(() => formatMonthYear(profile?.created_at), [profile?.created_at]);
  const canGoBack = navigation.canGoBack();

  const syncForm = useCallback((nextProfile: ProfileDetails) => {
    if (!nextProfile) return;
    setUsername(nextProfile.username);
    setDisplayName(nextProfile.display_name || '');
    setBio(nextProfile.bio || '');
    setLocation(nextProfile.location || '');
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextProfile, publicPrayers, circlePrayers, privatePrayers] = await Promise.all([
        getMyProfile(),
        getMyPrayers('public'),
        getMyPrayers('circle'),
        getMyPrayers('private'),
      ]);

      if (!nextProfile) {
        setError("We couldn't load your profile.");
        return;
      }

      setProfile(nextProfile);
      setStats({
        public: publicPrayers.length,
        circle: circlePrayers.length,
        private: privatePrayers.length,
      });
      syncForm(nextProfile);
    } catch {
      setError("We couldn't load your profile.");
    } finally {
      setLoading(false);
    }
  }, [syncForm]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleSave = async () => {
    if (saving) return;
    setError('');

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();
    const trimmedBio = bio.trim();
    const trimmedLocation = location.trim();

    const validation = validateProfile({
      username: trimmedUsername,
      displayName: trimmedDisplayName,
    });
    if (!validation.success) {
      setError(Object.values(validation.errors || {})[0] || 'Check your profile details.');
      return;
    }
    if (trimmedBio.length > 160) {
      setError('Bio must be 160 characters or fewer.');
      return;
    }
    if (trimmedLocation.length > 100) {
      setError('Location must be 100 characters or fewer.');
      return;
    }

    setSaving(true);
    try {
      const ok = await updateProfile({
        username: validation.data?.username || trimmedUsername,
        display_name: trimmedDisplayName,
        bio: trimmedBio,
        location: trimmedLocation,
      });

      if (!ok) {
        setError("We couldn't save your changes. The username may already be taken.");
        return;
      }

      const [nextProfile] = await Promise.all([getMyProfile(), refreshProfile()]);
      if (nextProfile) {
        setProfile(nextProfile);
        syncForm(nextProfile);
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    syncForm(profile);
    setEditing(false);
    setError('');
  };

  const handleAvatarUpload = async () => {
    if (uploading) return;

    setUploading(true);
    setError('');
    try {
      const result = await chooseAndUploadAvatar();
      if (result.status === 'cancelled') return;
      if (result.status === 'error') {
        Alert.alert('Photo not updated', result.message);
        return;
      }

      const ok = await updateProfile({ avatar_url: result.url });
      if (!ok) {
        Alert.alert('Photo not updated', "We couldn't save that photo to your profile.");
        return;
      }

      const [nextProfile] = await Promise.all([getMyProfile(), refreshProfile()]);
      if (nextProfile) setProfile(nextProfile);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.dim}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <ArrowLeftIcon color={colors.textSecondary} size={20} strokeWidth={1.7} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
        <View style={styles.headerText}>
          <ScreenHeaderTitle subtitle={`@${profile?.username || ''}`} title="Profile" />
        </View>
        <Pressable
          accessibilityLabel="Open settings"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Settings')}
          style={styles.iconButton}
        >
          <SettingsIcon color={colors.textSecondary} size={19} strokeWidth={1.7} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            <Avatar name={name} size={88} uri={profile?.avatar_url} />
            <Pressable
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
              disabled={uploading}
              onPress={() => void handleAvatarUpload()}
              style={styles.cameraButton}
            >
              {uploading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <CameraIcon color={colors.white} size={16} strokeWidth={1.8} />
              )}
            </Pressable>
          </View>
          <Text style={styles.displayName}>{name}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {profile?.location ? <Text style={styles.location}>{profile.location}</Text> : null}
          {accountSince ? <Text style={styles.memberSince}>Joined {accountSince}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Public" value={stats.public} />
          <Stat label="Circle" value={stats.circle} />
          <Stat label="Private" value={stats.private} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          {editing ? (
            <View style={styles.editActions}>
              <Pressable
                accessibilityLabel="Cancel profile edit"
                accessibilityRole="button"
                disabled={saving}
                onPress={cancelEdit}
                style={styles.smallIconButton}
              >
                <XIcon color={colors.textMuted} size={18} strokeWidth={1.8} />
              </Pressable>
              <Pressable
                accessibilityLabel="Save profile"
                accessibilityRole="button"
                disabled={saving}
                onPress={() => void handleSave()}
                style={[styles.smallIconButton, styles.saveButton]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <CheckIcon color={colors.white} size={18} strokeWidth={1.9} />
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Edit profile"
              accessibilityRole="button"
              onPress={() => setEditing(true)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          )}
        </View>

        {editing ? (
          <View style={styles.form}>
            <ProfileField
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <ProfileField label="Display name" value={displayName} onChangeText={setDisplayName} />
            <ProfileField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              maxLength={160}
              multiline
              style={styles.multiline}
            />
            <ProfileField
              label="Location"
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />
          </View>
        ) : (
          <View style={styles.rows}>
            <ProfileRow label="Username" value={`@${profile?.username || ''}`} />
            <ProfileRow
              label="Display name"
              value={profile?.display_name || profile?.username || ''}
            />
            <ProfileRow label="Bio" value={profile?.bio || 'Not set'} muted={!profile?.bio} />
            <ProfileRow
              label="Location"
              value={profile?.location || 'Not set'}
              muted={!profile?.location}
            />
          </View>
        )}

        <View style={styles.rows}>
          <ActionRow
            label="Manage Prayer Circle"
            onPress={() => navigation.navigate('PrayerCircleManagement')}
          />
          <ActionRow label="Updates" onPress={() => navigation.navigate('Updates')} />
          <ActionRow label="Settings" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileField({
  label,
  style,
  ...props
}: ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.textDim} style={[styles.field, style]} {...props} />
    </View>
  );
}

function ProfileRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, muted && styles.rowValueMuted]}>{value}</Text>
    </View>
  );
}

function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionRow}>
      <Text style={styles.actionText}>{label}</Text>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  );
}

function formatMonthYear(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
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
  identity: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 18,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  displayName: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 22,
    textAlign: 'center',
  },
  username: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    marginTop: 4,
  },
  bio: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
  location: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    marginTop: 8,
  },
  memberSince: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 8,
  },
  statsRow: {
    minHeight: 76,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    marginBottom: 22,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 20,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  sectionHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 14,
  },
  editButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  editButtonText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: colors.accentDark,
  },
  form: {
    gap: 12,
    marginBottom: 18,
  },
  fieldBlock: {
    gap: 7,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  field: {
    minHeight: 48,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  rows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    marginBottom: 18,
  },
  row: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    justifyContent: 'center',
    gap: 3,
  },
  rowLabel: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  rowValue: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  rowValueMuted: {
    color: colors.textDim,
  },
  actionRow: {
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  actionChevron: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 24,
  },
});
