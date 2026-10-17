import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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
