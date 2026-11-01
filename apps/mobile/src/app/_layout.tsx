import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { migrate } from '@/lib/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="halal-o.db" onInit={migrate}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Halal-O', headerShown: false }} />
        <Stack.Screen name="product/[barcode]" options={{ title: 'Result' }} />
        <Stack.Screen name="manual" options={{ title: 'Check ingredients' }} />
        <Stack.Screen name="history" options={{ title: 'History' }} />
      </Stack>
      <StatusBar style="auto" />
    </SQLiteProvider>
  );
}
