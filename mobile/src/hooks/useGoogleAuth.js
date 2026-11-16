// mobile/src/hooks/useGoogleAuth.js
// v2.0.3 — Forces raw error alert on screen to debug native silent failure.

import { useState, useRef } from 'react';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Alert } from 'react-native';

GoogleSignin.configure({
  webClientId: '264411909899-7dit8iu4b93gunb11c0oeracrbqb31rd.apps.googleusercontent.com',
  offlineAccess: false,
});

export const useGoogleAuth = ({ onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const busyRef = useRef(false);

  const promptAsync = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsLoading(true);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      try {
        await GoogleSignin.signOut();
      } catch {
        /* nothing to sign out of */
      }

      const result = await GoogleSignin.signIn();

      if (result?.type === 'cancelled') return;

      const idToken = result?.data?.idToken ?? result?.idToken;
      if (!idToken) {
        Alert.alert('Debug', 'No ID token returned from Google');
        onError?.('No ID token returned from Google');
        return;
      }

      await onSuccess(idToken);
    } catch (error) {
      // ★ FORCE THE ERROR TO SHOW ON SCREEN
      Alert.alert(
        'Debug Raw Error',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );

      if (
        error?.code === statusCodes.SIGN_IN_CANCELLED ||
        error?.code === statusCodes.IN_PROGRESS
      ) {
        return;
      }
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError?.('Google Play Services is missing or out of date on this device');
        return;
      }
      if (String(error?.code) === '10') {
        onError?.('Google config error (code 10): check package name and SHA-1 in Google Cloud');
        return;
      }
      onError?.(error?.message || 'Google login failed');
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  };

  return { promptAsync, isLoading, request: true };
};