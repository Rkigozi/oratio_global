import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/auth-context';
import {
  Brand,
  ErrorText,
  Field,
  InfoText,
  LinkButton,
  PrimaryButton,
  Screen,
} from '../components/ui';
import type { RootStackParamList } from '../navigation';

export function ResetPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    setLoading(true);
    const err = await resetPassword(email.trim());
    setLoading(false);
    if (err) setError(err);
    else setSent(true);
  };

  if (sent) {
    return (
      <Screen>
        <Brand subtitle="Check Your Email" />
        <InfoText>
          If an account exists for {email.trim()}, a password reset link is on its way. It opens in
          your browser — set your new password there, then come back and sign in.
        </InfoText>
        <LinkButton title="Back to Sign In" onPress={() => navigation.navigate('Login')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Brand subtitle="Reset your password" />
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
      <ErrorText>{error}</ErrorText>
      <PrimaryButton title="Send Reset Link" onPress={() => void handleReset()} loading={loading} />
      <LinkButton title="Back to Sign In" onPress={() => navigation.navigate('Login')} />
    </Screen>
  );
}
