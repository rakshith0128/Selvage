import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { theme } from '../../src/components/theme';
import { useClosetStore } from '../../src/store/useClosetStore';

export default function TabsLayout() {
  useEffect(() => {
    useClosetStore.getState().load();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentInk,
        tabBarInactiveTintColor: theme.inkFaint,
        tabBarStyle: { backgroundColor: theme.canvas, borderTopColor: theme.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="closet" options={{ title: 'Closet' }} />
      <Tabs.Screen name="outfits" options={{ title: 'Log' }} />
    </Tabs>
  );
}
