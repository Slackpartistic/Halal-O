import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { Verdict } from '@halal-o/engine';
import { useProductLookup } from '@/lib/lookup';

// A first, plain result view. PR 6 replaces it with the full result screen
// (explanations, sources, "assumed halal" list, report button).
const VERDICT_STYLE: Record<Verdict, { label: string; color: string }> = {
  halal: { label: 'Halal', color: '#1b7f4b' },
  haram: { label: 'Haram', color: '#b3261e' },
  mushbooh: { label: 'Mushbooh', color: '#b26a00' },
  unknown: { label: 'Not enough information', color: '#5f6368' },
};

export default function ProductScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const state = useProductLookup(barcode);

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (state.status === 'not_found') {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>We don't have this product yet</Text>
        <Text style={styles.body}>Barcode {barcode} isn't in Open Food Facts. Typing in the ingredients is coming in the next update.</Text>
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Lookup failed</Text>
        <Text style={styles.body}>{state.message}</Text>
      </View>
    );
  }

  const { product, result } = state;
  const v = VERDICT_STYLE[result.verdict];
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" /> : null}
      <Text style={styles.heading}>{product.name ?? `Barcode ${barcode}`}</Text>
      {product.brand ? <Text style={styles.body}>{product.brand}</Text> : null}

      <View style={[styles.badge, { backgroundColor: v.color }]}>
        <Text style={styles.badgeText}>{v.label}</Text>
        {result.certified ? <Text style={styles.badgeSub}>Halal label reported on pack</Text> : null}
      </View>

      {result.reasons.map((r, i) => (
        <View key={i} style={styles.reason}>
          <Text style={styles.reasonTitle}>
            {r.ingredientText}: {VERDICT_STYLE[r.verdict].label}
          </Text>
          <Text style={styles.body}>{r.rationale}</Text>
        </View>
      ))}

      <Text style={styles.disclaimer}>
        This checks ingredients against a reference list following Hanafi rulings. It is not a fatwa or certification.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: '#fff' },
  image: { width: '100%', height: 180 },
  heading: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, color: '#444', textAlign: 'center' },
  badge: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  badgeSub: { color: '#fff', fontSize: 14, marginTop: 4 },
  reason: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, gap: 4 },
  reasonTitle: { fontSize: 16, fontWeight: '600' },
  disclaimer: { fontSize: 12, color: '#777', textAlign: 'center', marginTop: 8 },
});
