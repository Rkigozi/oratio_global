import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { blockUser } from '@oratio/shared/queries';
import { useAuth } from './auth-context';

export function useBlockUser(onBlocked: () => void) {
  const { user } = useAuth();
  const pending = useRef(false);
  const [blocking, setBlocking] = useState(false);

  const confirmBlock = (userId: string, username?: string) => {
    if (!user || !userId || userId === user.id || pending.current) return;
    pending.current = true;
    let submitted = false;
    const cancel = () => {
      if (!submitted) pending.current = false;
    };
    Alert.alert(
      username ? `Block @${username}?` : 'Block this account?',
      "You won't see each other's prayers or comments, or be able to interact. Any Circle connection and pending invitations will be removed. You can unblock them in Settings.",
      [
        { text: 'Cancel', style: 'cancel', onPress: cancel },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            if (submitted) return;
            submitted = true;
            setBlocking(true);
            void blockUser(userId)
              .then(() => {
                onBlocked();
                Alert.alert('Account blocked');
              })
              .catch((error: unknown) => {
                Alert.alert(
                  'Account not blocked',
                  error instanceof Error ? error.message : 'Please try again.'
                );
              })
              .finally(() => {
                pending.current = false;
                setBlocking(false);
              });
          },
        },
      ],
      { cancelable: true, onDismiss: cancel }
    );
  };
  return { blocking, confirmBlock };
}
