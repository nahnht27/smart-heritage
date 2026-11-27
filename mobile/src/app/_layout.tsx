import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { loadServerUrl } from '../services/serverSettings';
import { loadOfflinePack } from '../services/offline/packFiles';
import { flushPendingInteractions } from '../services/interactionApi';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  // Screens must not load content before the saved server address and the
  // downloaded pack are available.
  useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      await Promise.all([loadServerUrl(), loadOfflinePack()]);
      if (mounted) setIsReady(true);
      void flushPendingInteractions();
    };
    void prepare();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void flushPendingInteractions();
      }
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1E293B', // Slate dark navy - Heritage theme
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerBackTitle: 'Quay lại',
          contentStyle: {
            backgroundColor: '#F8FAFC',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false, // Login screen has its own custom banner/header
          }}
        />
        <Stack.Screen
          name="home"
          options={{
            title: 'Smart Heritage',
            headerBackVisible: false, // Prevent going back to Login with back button
          }}
        />
        <Stack.Screen
          name="artifact_list"
          options={{
            title: 'Danh sách Hiện vật',
          }}
        />
        <Stack.Screen
          name="artifact_detail"
          options={{
            title: 'Chi tiết Hiện vật',
          }}
        />
        <Stack.Screen
          name="map"
          options={{
            title: 'Bản đồ Di sản',
          }}
        />
        <Stack.Screen
          name="favorite"
          options={{
            title: 'Yêu thích & Lịch sử',
          }}
        />
        <Stack.Screen
          name="feedback"
          options={{
            title: 'Đánh giá & Góp ý',
          }}
        />
      </Stack>
    </>
  );
}
