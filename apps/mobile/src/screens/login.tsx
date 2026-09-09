import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/auth-context';
import { Brand, ErrorText, Field, LinkButton, PrimaryButton, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password');
      return;
    }
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <Screen>
      <Brand subtitle="Welcome back" />
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
      <Field
        label="Password"
        placeholder="Your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={Boolean(error)}
      />
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Sign In" onPress={() => void handleSignIn()} loading={loading} />
      <LinkButton title="Forgot password?" onPress={() => navigation.navigate('ResetPassword')} />
      <LinkButton
        title="New here? Create an account"
        onPress={() => navigation.navigate('SignUp')}
      />
    </Screen>
  );
}
