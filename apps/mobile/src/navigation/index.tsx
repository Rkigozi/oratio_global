import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/auth-context';
import { LoginScreen } from '../screens/login';
import { SignUpScreen } from '../screens/signup';
import { ResetPasswordScreen } from '../screens/reset-password';
import { FeedScreen } from '../screens/feed';
import { PrayerDetailScreen } from '../screens/prayer-detail';
import { SubmitScreen } from '../screens/submit';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ResetPassword: undefined;
  Feed: undefined;
  PrayerDetail: { prayerId: string };
  Submit: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Feed" component={FeedScreen} />
          <Stack.Screen name="PrayerDetail" component={PrayerDetailScreen} />
          <Stack.Screen name="Submit" component={SubmitScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
