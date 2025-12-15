import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Input from '../../components/ui/Input';
import { Colors } from '../../constants/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordMeetsRequirements = (value: string) => {
    if (!value) return false;
    const minLength = value.length >= 10;
    const hasSpecialChar = /[^A-Za-z0-9]/.test(value);
    return minLength && hasSpecialChar;
  };

  const passwordError = password && !passwordMeetsRequirements(password)
    ? 'Password must be at least 10 characters and include a special character'
    : undefined;

  const confirmPasswordError =
    confirmPassword && passwordMeetsRequirements(password)
      ? password !== confirmPassword
        ? 'Passwords do not match'
        : undefined
      : undefined;

  const handleSubmit = async () => {
    setError('');

    if (!passwordMeetsRequirements(password)) {
      setError('Password must be at least 10 characters long and include at least one special character');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Mobile apps handle this differently
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Check if user already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('This email is already registered. Please sign in instead.');
        setLoading(false);
        return;
      }

      // Navigate to verification pending or dashboard
      router.replace('/auth/verification-pending');
    } catch {
      setError('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/auth/welcome')}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/text-to-reel-icon.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={loading}
          />

          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password (min 10 characters...)"
            secureTextEntry
            showPasswordToggle
            error={passwordError}
            disabled={loading}
          />

          <Input
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
            showPasswordToggle
            error={confirmPasswordError}
            disabled={loading}
          />

          <TouchableOpacity
            style={[styles.createAccountButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !!passwordError || !!confirmPasswordError}
            activeOpacity={0.8}
          >
            <Text style={styles.createAccountButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 30,
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
  },
  createAccountButton: {
    backgroundColor: Colors.cyan[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.cyan[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  signInText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  signInLink: {
    fontSize: 14,
    color: Colors.cyan[500],
    fontWeight: '600',
  },
});

