import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ResultView, VERDICT_STYLE } from '@/components/ResultView';
import { useProductLookup } from '@/lib/lookup';

export default function ProductScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const state = useProductLookup(barcode);
  const typeIngredients = () => router.push({ pathname: '/manual', params: { barcode } });
  const report = (params: { product?: string; verdict?: string; problem?: string }) =>
    router.push({ pathname: '/report', params: { barcode, ...params } });

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
        <Text style={styles.heading}>We don't have this product's ingredients</Text>
        <Text style={styles.body}>Barcode {barcode} isn't in Open Food Facts yet. You can type the ingredients from the pack instead.</Text>
        <Pressable style={styles.button} onPress={typeIngredients}>
          <Text style={styles.buttonText}>Type the ingredients</Text>
        </Pressable>
        <Text style={styles.link} accessibilityRole="link" onPress={() => report({ problem: 'Product is missing' })}>
          Send us this product
        </Text>
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Lookup failed</Text>
        <Text style={styles.body}>{state.message}</Text>
        <Pressable style={styles.button} onPress={typeIngredients}>
          <Text style={styles.buttonText}>Type the ingredients</Text>
        </Pressable>
      </View>
    );
  }

  const { product, result, fromCache } = state;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" /> : null}
      <Text style={styles.heading}>{product.name ?? `Barcode ${barcode}`}</Text>
      {product.brand ? <Text style={styles.body}>{product.brand}</Text> : null}

      <ResultView result={result} />

      {result.verdict === 'unknown' ? (
        <Pressable style={styles.button} onPress={typeIngredients}>
          <Text style={styles.buttonText}>Type the ingredients</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={() => report({ product: [product.name, product.brand].filter(Boolean).join(', ') || undefined, verdict: VERDICT_STYLE[result.verdict].label })}
      >
        <Text style={[styles.buttonText, styles.secondaryText]}>Report a problem</Text>
      </Pressable>
      <Text style={styles.meta}>
        Product data from Open Food Facts{fromCache ? ' (saved on this phone)' : ''}. Barcode {barcode}.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  image: { width: '100%', height: 180 },
  heading: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, color: '#444', textAlign: 'center' },
  meta: { fontSize: 12, color: '#888', textAlign: 'center' },
  button: { backgroundColor: '#1b7f4b', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1b7f4b' },
  secondaryText: { color: '#1b7f4b' },
  link: { color: '#1a5fb4', fontSize: 15, textAlign: 'center' },
});
