import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { validateProfile } from '@oratio/shared/validation';
import { useAuth } from '../hooks/auth-context';
import {
  Brand,
  ErrorText,
  Field,
  InfoText,
  LinkButton,
  PasswordField,
  PrimaryButton,
  Screen,
} from '../components/ui';
import type { RootStackParamList } from '../navigation';

export function SignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp, needsEmailVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError('');
    if (!email.trim() || !password.trim() || !username.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const validation = validateProfile({
      username: username.trim().toLowerCase(),
      displayName: '',
    });
    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0];
      setError(firstError || "That username isn't valid");
      return;
    }
    setLoading(true);
    const err = await signUp(email.trim(), password, username.trim().toLowerCase());
    setLoading(false);
    if (err) setError(err);
  };

  if (needsEmailVerification) {
    return (
      <Screen>
        <Brand subtitle="Check Your Email" />
        <InfoText>
          We&apos;ve sent a confirmation link to {email.trim()}. Click it to verify your account,
          then sign in.
        </InfoText>
        <LinkButton title="Go to Sign In" onPress={() => navigation.navigate('Login')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Brand subtitle="Create your account" />
      <Field
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        error={Boolean(error)}
      />
      <PasswordField
        label="Password"
        placeholder="At least 6 characters"
        value={password}
        onChangeText={setPassword}
        error={error.toLowerCase().includes('password')}
      />
      <Field
        label="Username"
        placeholder="prayer_warrior"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        error={Boolean(error)}
      />
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Create Account" onPress={() => void handleSignUp()} loading={loading} />
      <LinkButton
        title="Already have an account? Sign in"
        onPress={() => navigation.navigate('Login')}
      />
    </Screen>
  );
}
