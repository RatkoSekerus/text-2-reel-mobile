import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Input from '../../components/ui/Input';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Successful login - navigation will be handled by auth state change
      router.replace('/dashboard');
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
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
            placeholder="Enter your password"
            secureTextEntry
            showPasswordToggle
            disabled={loading}
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Logging in...' : 'Log In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => router.push('/auth/forgot-password')}
            activeOpacity={0.8}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.8}
          >
            <Text style={styles.createAccountButtonText}>Create New Account</Text>
          </TouchableOpacity>
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
  loginButton: {
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
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.cyan[500],
    fontWeight: '500',
  },
  createAccountButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.cyan[500],
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

