import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from './theme';

export function LoginScreen() {
  const { signIn, signUp, authError } = useAuthStore();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setSignedUp(false);
    if (mode === 'signIn') {
      await signIn(email.trim(), password);
    } else {
      await signUp(email.trim(), password);
      setSignedUp(true);
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Selvage</Text>
      <Text style={styles.subtitle}>
        {mode === 'signIn' ? 'Sign in to your closet' : 'Create an account'}
      </Text>

      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={theme.inkFaint}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      <Text style={styles.fieldLabel}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={theme.inkFaint}
        secureTextEntry
        autoCapitalize="none"
      />

      {authError ? <Text style={styles.error}>{authError}</Text> : null}
      {signedUp && !authError ? (
        <Text style={styles.info}>Check your email to confirm your account, then sign in.</Text>
      ) : null}

      <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>
            {mode === 'signIn' ? 'Sign in' : 'Sign up'}
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.switchBtn}
        onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
      >
        <Text style={styles.switchBtnText}>
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.canvas, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', color: theme.ink, textAlign: 'center' },
  subtitle: { fontSize: 13, color: theme.inkSoft, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  fieldLabel: { fontSize: 12, color: theme.inkSoft, marginBottom: 6 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.ink,
    marginBottom: 16,
  },
  error: { fontSize: 12.5, color: '#B3261E', marginBottom: 12 },
  info: { fontSize: 12.5, color: theme.accentInk, marginBottom: 12 },
  submitBtn: {
    backgroundColor: theme.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  switchBtn: { marginTop: 16, alignItems: 'center' },
  switchBtnText: { color: theme.accentInk, fontSize: 12.5, fontWeight: '500' },
});
