import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Welcome } from '@/components/Welcome';
import { DISCLAIMER_VERSION } from '@/lib/copy';
import { getSetting, migrate, setSetting } from '@/lib/db';

function App() {
  const db = useSQLiteContext();
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    getSetting(db, 'disclaimer_accepted')
      .then((v) => setAccepted(v === DISCLAIMER_VERSION))
      .catch(() => setAccepted(false));
  }, [db]);

  if (accepted === null) return null;
  if (!accepted) {
    return (
      <Welcome
        onAccept={() => {
          setAccepted(true);
          setSetting(db, 'disclaimer_accepted', DISCLAIMER_VERSION).catch(() => {});
        }}
      />
    );
  }
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Halal-O', headerShown: false }} />
      <Stack.Screen name="product/[barcode]" options={{ title: 'Result' }} />
      <Stack.Screen name="manual" options={{ title: 'Check ingredients' }} />
      <Stack.Screen name="history" options={{ title: 'History' }} />
      <Stack.Screen name="report" options={{ title: 'Report a problem' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="halal-o.db" onInit={migrate}>
      <App />
      <StatusBar style="auto" />
    </SQLiteProvider>
  );
}
