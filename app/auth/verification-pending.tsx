import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

export default function VerificationPendingScreen() {
  return (
    <LinearGradient
      colors={Colors.background.gradient as [string, string, string]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Verification Email Sent</Text>
        <Text style={styles.text}>
          Please check your email and click the verification link to activate your account.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
});

