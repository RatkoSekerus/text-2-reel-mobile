import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, Text, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async (url?: string) => {
      try {
        // Get URL from params or passed parameter
        const callbackUrl = url || (await Linking.getInitialURL());
        
        console.log('OAuth callback URL:', callbackUrl);
        console.log('Params:', params);
        
        // Extract tokens from URL parameters
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // Helper function to parse URL parameters
        const parseParams = (paramString: string) => {
          const params: Record<string, string> = {};
          paramString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key && value) {
              params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          });
          return params;
        };

        // Try to get from expo-router params first
        accessToken = params.access_token as string;
        refreshToken = params.refresh_token as string;

        // If not in params, try to parse from URL
        if (!accessToken && callbackUrl) {
          try {
            // Parse hash fragment first (common for OAuth callbacks)
            const hashIndex = callbackUrl.indexOf('#');
            if (hashIndex !== -1) {
              const hash = callbackUrl.substring(hashIndex + 1);
              const hashParams = parseParams(hash);
              accessToken = hashParams.access_token || null;
              refreshToken = hashParams.refresh_token || null;
            }
            
            // Fallback to query params
            if (!accessToken) {
              const queryIndex = callbackUrl.indexOf('?');
              if (queryIndex !== -1) {
                const query = callbackUrl.substring(queryIndex + 1).split('#')[0];
                const queryParams = parseParams(query);
                accessToken = queryParams.access_token || null;
                refreshToken = queryParams.refresh_token || null;
              }
            }
          } catch (e) {
            console.warn('Error parsing URL:', e);
          }
        }

        console.log('Extracted tokens:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

        if (accessToken && refreshToken) {
          // Set the session with the tokens from the callback
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            setError(sessionError.message);
            setTimeout(() => {
              router.replace('/auth/welcome');
            }, 3000);
            return;
          }

          // Success - redirect to dashboard
          console.log('Session set successfully, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          // If no tokens in params, Supabase might have handled it automatically
          // Wait a moment and check for session
          console.log('No tokens found, checking for existing session...');
          setTimeout(async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (session && !sessionError) {
              console.log('Session found, redirecting to dashboard');
              router.replace('/dashboard');
            } else {
              console.warn('No session found after OAuth callback', sessionError);
              setError('Failed to establish session. Please try signing in again.');
              setTimeout(() => {
                router.replace('/auth/welcome');
              }, 3000);
            }
          }, 1500);
        }
      } catch (err: any) {
        console.error('Error handling OAuth callback:', err);
        setError(err.message || 'An error occurred during sign in');
        setTimeout(() => {
          router.replace('/auth/welcome');
        }, 3000);
      }
    };

    // Listen for URL events (when app is opened via deep link)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Received URL event:', url);
      if (url.includes('auth/callback')) {
        handleCallback(url);
      }
    });

    // Handle initial URL
    handleCallback();

    return () => {
      subscription.remove();
    };
  }, [params, router]);

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
    >
      <ActivityIndicator size="large" color={Colors.cyan[500]} />
      <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16, textAlign: 'center' }}>
        {error ? 'Sign in failed' : 'Completing sign in...'}
      </Text>
      {error && (
        <Text style={{ color: '#FF4444', marginTop: 8, fontSize: 14, textAlign: 'center' }}>
          {error}
        </Text>
      )}
    </LinearGradient>
  );
}

