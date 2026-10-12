import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Login" }} />
      <Stack.Screen name="home" options={{ title: "Smart Heritage - Home", headerBackVisible: false }} />
      <Stack.Screen name="artifact_list" options={{ title: "Artifacts" }} />
      <Stack.Screen name="artifact_detail" options={{ title: "Artifact Detail" }} />
      <Stack.Screen name="map" options={{ title: "Map" }} />
      <Stack.Screen name="favorite" options={{ title: "Favorites & History" }} />
      <Stack.Screen name="feedback" options={{ title: "Feedback" }} />
    </Stack>
  );
}
