/**
 * Firebase Authentication Screen
 * Handles email/password, Google, and phone number authentication
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { FirebaseAuthService } from '../services/FirebaseAuthService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface FirebaseAuthScreenProps {
  onAuthSuccess: () => void;
}

export const FirebaseAuthScreen: React.FC<FirebaseAuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'phone'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '345211832799-meum1jfjbd5phtshdpt6osj9mrigr1n9.apps.googleusercontent.com',
    });
  }, []);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await FirebaseAuthService.signUpWithEmail(email, password, displayName || undefined);
      Alert.alert(
        'Success',
        'Account created! Please check your email to verify your account.',
        [{ text: 'OK', onPress: onAuthSuccess }]
      );
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await FirebaseAuthService.signInWithEmail(email, password);
      Alert.alert('Success', 'Signed in successfully!', [
        { text: 'OK', onPress: onAuthSuccess },
      ]);
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await FirebaseAuthService.signInWithGoogle();
      Alert.alert('Success', 'Signed in with Google!', [
        { text: 'OK', onPress: onAuthSuccess },
      ]);
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const verificationId = await FirebaseAuthService.sendPhoneVerification(phoneNumber);
      setConfirmationId(verificationId);
      Alert.alert('Success', 'Verification code sent! Check your messages.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!confirmationId || !verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      await FirebaseAuthService.verifyPhoneCode(confirmationId, verificationCode);
      Alert.alert('Success', 'Phone verified successfully!', [
        { text: 'OK', onPress: onAuthSuccess },
      ]);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await FirebaseAuthService.sendPasswordResetEmail(email);
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>🎵 ToneMap</Text>
          <Text style={styles.subtitle}>
            {mode === 'phone' 
              ? 'Sign in with phone number'
              : mode === 'signin' 
              ? 'Sign in to your account' 
              : 'Create your account'}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'phone' ? (
            // Phone Authentication
            <>
              <TextInput
                style={styles.input}
                placeholder="Phone Number (e.g. +1234567890)"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
              />

              {confirmationId && (
                <TextInput
                  style={styles.input}
                  placeholder="Verification Code"
                  placeholderTextColor="#999"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                />
              )}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={confirmationId ? handleVerifyPhoneCode : handleSendPhoneCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {confirmationId ? 'Verify Code' : 'Send Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            // Email/Password Authentication
            <>
              {mode === 'signup' && (
                <TextInput
                  style={styles.input}
                  placeholder="Display Name (optional)"
                  placeholderTextColor="#999"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />

              {mode === 'signin' && (
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={mode === 'signin' ? handleSignIn : handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={styles.googleButtonText}>🔍 Continue with Google</Text>
              </TouchableOpacity>

              {/* Phone Auth Button */}
              <TouchableOpacity
                style={[styles.phoneButton, loading && styles.buttonDisabled]}
                onPress={() => setMode('phone')}
                disabled={loading}
              >
                <Text style={styles.phoneButtonText}>📱 Continue with Phone</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.switchModeContainer}>
            {mode === 'phone' ? (
              <TouchableOpacity onPress={() => setMode('signin')}>
                <Text style={styles.switchModeLink}>← Back to Email Sign In</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.switchModeText}>
                  {mode === 'signin'
                    ? "Don't have an account? "
                    : 'Already have an account? '}
                </Text>
                <TouchableOpacity
                  onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                >
                  <Text style={styles.switchModeLink}>
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            After signing in, you'll connect your Spotify account
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0118', // Dark purple background (matching your app)
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#A78BFA', // Purple primary color
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#1C1525', // Dark purple surface
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F3F4F6',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B2B54', // Dark purple border
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#A78BFA', // Purple accent
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6', // Vibrant purple button
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  switchModeText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  switchModeLink: {
    color: '#C4B5FD', // Light purple accent
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3B2B54',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    color: '#1E1B4B',
    fontSize: 16,
    fontWeight: '600',
  },
  phoneButton: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)', // Subtle purple tint
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B2B54',
  },
  phoneButtonText: {
    color: '#A78BFA',
    fontSize: 16,
    fontWeight: '600',
  },
});
