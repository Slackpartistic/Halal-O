import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DISCLAIMER, VERDICT_HELP } from '@/lib/copy';
import { VERDICT_STYLE } from './ResultView';

const COLORS: Record<string, string> = {
  Halal: VERDICT_STYLE.halal.color,
  Haram: VERDICT_STYLE.haram.color,
  Mushbooh: VERDICT_STYLE.mushbooh.color,
};

/** Shown on first launch, and again whenever DISCLAIMER_VERSION changes. */
export function Welcome({ onAccept }: { onAccept: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Welcome to Halal-O</Text>
        <Text style={styles.body}>Scan a food barcode and Halal-O checks its ingredients. Every product gets one of three verdicts:</Text>
        {VERDICT_HELP.map((v) => (
          <View key={v.label} style={styles.row}>
            <Text style={[styles.pill, { backgroundColor: COLORS[v.label] }]}>{v.label}</Text>
            <Text style={styles.rowText}>{v.text}</Text>
          </View>
        ))}
        <Text style={styles.heading}>Please keep in mind</Text>
        <Text style={styles.body}>{DISCLAIMER}</Text>
        <Text style={styles.body}>
          Product data comes from Open Food Facts, a database anyone can edit, so it can be missing or out of date. Always check the pack.
        </Text>
      </ScrollView>
      <Pressable style={styles.button} onPress={onAccept} accessibilityRole="button">
        <Text style={styles.buttonText}>I understand</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 16 },
  heading: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  body: { fontSize: 16, color: '#333', lineHeight: 22 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pill: { color: '#fff', fontSize: 13, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', minWidth: 78, textAlign: 'center' },
  rowText: { flex: 1, fontSize: 15, color: '#444', lineHeight: 21 },
  button: { backgroundColor: '#1b7f4b', borderRadius: 12, margin: 24, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
