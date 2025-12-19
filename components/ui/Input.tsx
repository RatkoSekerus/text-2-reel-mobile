import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  error?: string;
  disabled?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export default function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  showPasswordToggle = false,
  error,
  disabled = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#888888"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          editable={!disabled}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  inputContainerError: {
    borderColor: '#FF4444',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});










