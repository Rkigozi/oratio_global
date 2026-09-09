import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/auth-context';
import { Screen } from '../components/ui';
import { colors } from '../theme';

export function FeedScreen() {
  const { profile, signOut } = useAuth();
  const displayName = profile?.display_name || profile?.username || 'friend';

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.title}>Welcome, {displayName}</Text>
        <Text style={styles.subtitle}>You&apos;re signed in. The prayer feed lands here next.</Text>
        <Pressable onPress={() => void signOut()} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '500',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  signOut: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  signOutText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
