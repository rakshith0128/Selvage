import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { LoginScreen } from '../src/components/LoginScreen';
import { theme } from '../src/components/theme';

export default function RootLayout() {
  const { session, initializing, init } = useAuthStore();

  useEffect(() => {
    init();
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="add-item"
        options={{ presentation: 'modal', headerShown: true, title: 'Add an item' }}
      />
      <Stack.Screen name="item/[id]" options={{ headerShown: true, title: '' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.canvas },
});
