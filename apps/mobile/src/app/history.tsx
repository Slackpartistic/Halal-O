import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { VERDICT_STYLE } from '@/components/ResultView';
import { listScans, recheckScans, type Scan } from '@/lib/history';

function when(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString();
}

function Row({ scan }: { scan: Scan }) {
  const v = VERDICT_STYLE[scan.verdict];
  const prev = scan.previousVerdict ? VERDICT_STYLE[scan.previousVerdict] : null;
  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push({ pathname: '/product/[barcode]', params: { barcode: scan.barcode } })}
      accessibilityRole="button"
      accessibilityLabel={`${scan.name ?? scan.barcode}, ${v.label}${prev ? `, changed from ${prev.label}` : ''}`}
    >
      {scan.imageUrl ? (
        <Image source={{ uri: scan.imageUrl }} style={styles.thumb} resizeMode="contain" />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {scan.name ?? `Barcode ${scan.barcode}`}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[scan.brand, when(scan.scannedAt)].filter(Boolean).join(' · ')}
        </Text>
        {prev ? (
          <Text style={styles.changed}>
            Verdict changed: {prev.label} → {v.label}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.pill, { backgroundColor: v.color }]}>{v.label}</Text>
    </Pressable>
  );
}

/** Recent scans, re-checked against the current ingredient reference each time the screen opens. */
export default function HistoryScreen() {
  const db = useSQLiteContext();
  const [search, setSearch] = useState('');
  const [scans, setScans] = useState<Scan[] | null>(null);
  // Bumped after each re-check, so the list reloads when returning from a product.
  const [checkedAt, setCheckedAt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      recheckScans(db)
        .catch(() => 0)
        .then(() => live && setCheckedAt(Date.now()));
      return () => {
        live = false;
      };
    }, [db]),
  );

  useEffect(() => {
    if (!checkedAt) return;
    let live = true;
    listScans(db, search).then((s) => live && setScans(s));
    return () => {
      live = false;
    };
  }, [db, search, checkedAt]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, brand or barcode"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
      <FlatList
        data={scans ?? []}
        keyExtractor={(s) => s.barcode}
        renderItem={({ item }) => <Row scan={item} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          scans ? (
            <Text style={styles.empty}>{search ? 'No scans match your search.' : 'Products you scan will appear here.'}</Text>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 12, fontSize: 16, height: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  thumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#f2f2f2' },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#777' },
  changed: { fontSize: 13, color: '#b26a00', fontWeight: '600' },
  pill: { color: '#fff', fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  sep: { height: 1, backgroundColor: '#eee' },
  empty: { textAlign: 'center', color: '#777', marginTop: 32, fontSize: 15 },
});
