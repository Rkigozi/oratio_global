import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Globe2,
  LockKeyhole,
  Map as MapIconSource,
  UserRound,
  UsersRound,
} from 'lucide-react-native';
import { useAuth } from '../hooks/auth-context';
import { LoginScreen } from '../screens/login';
import { SignUpScreen } from '../screens/signup';
import { ResetPasswordScreen } from '../screens/reset-password';
import { CircleScreen, FeedScreen } from '../screens/feed';
import { PrivatePrayersScreen } from '../screens/private-prayers';
import { PrayerCircleManagementScreen } from '../screens/prayer-circle-management';
import { LocationPrayersScreen, MapScreen } from '../screens/map';
import { MyPrayersScreen } from '../screens/my-prayers';
import { PrayerDetailScreen } from '../screens/prayer-detail';
import { ProfileScreen } from '../screens/profile';
import { SettingsScreen } from '../screens/settings';
import { SubmitScreen } from '../screens/submit';
import { UpdatesScreen } from '../screens/updates';
import { ActivityIndicator, View } from 'react-native';
import { colors, fontFamilies } from '../theme';
import { asNativeIcon } from '../components/icon';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ResetPassword: undefined;
  Main: undefined;
  MyPrayers: { initialAudience?: 'public' | 'circle' | 'private' } | undefined;
  PrayerDetail: { prayerId: string };
  LocationPrayers: { city: string; country: string };
  PrayerCircleManagement: undefined;
  Profile: undefined;
  Settings: undefined;
  Updates: undefined;
  Submit: undefined;
};

export type MainTabParamList = {
  Public: undefined;
  Map: undefined;
  Circle: undefined;
  Private: undefined;
  Me: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconProps = { color: string; size: number };

const tabIcon = (icon: unknown) => {
  const Icon = asNativeIcon(icon);

  function TabIcon({ color, size }: TabIconProps) {
    return <Icon color={color} size={Math.min(size, 23)} strokeWidth={1.7} />;
  }

  return TabIcon;
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          paddingTop: 4,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: { minHeight: 44 },
      }}
    >
      <Tab.Screen
        name="Public"
        component={FeedScreen}
        options={{
          tabBarAccessibilityLabel: 'Public prayers',
          tabBarIcon: tabIcon(Globe2),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarAccessibilityLabel: 'Prayer map',
          tabBarIcon: tabIcon(MapIconSource),
        }}
      />
      <Tab.Screen
        name="Circle"
        component={CircleScreen}
        options={{
          tabBarAccessibilityLabel: 'Prayer Circle',
          tabBarIcon: tabIcon(UsersRound),
        }}
      />
      <Tab.Screen
        name="Private"
        component={PrivatePrayersScreen}
        options={{
          tabBarAccessibilityLabel: 'Private prayers',
          tabBarIcon: tabIcon(LockKeyhole),
        }}
      />
      <Tab.Screen
        name="Me"
        component={ProfileScreen}
        options={{
          tabBarAccessibilityLabel: 'My profile',
          tabBarIcon: tabIcon(UserRound),
        }}
      />
    </Tab.Navigator>
  );
}

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
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="MyPrayers" component={MyPrayersScreen} />
          <Stack.Screen name="PrayerDetail" component={PrayerDetailScreen} />
          <Stack.Screen name="LocationPrayers" component={LocationPrayersScreen} />
          <Stack.Screen name="PrayerCircleManagement" component={PrayerCircleManagementScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Updates" component={UpdatesScreen} />
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
