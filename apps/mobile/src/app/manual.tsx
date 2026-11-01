import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ResultView, VERDICT_STYLE } from '@/components/ResultView';
import { evaluateProduct } from '@/lib/engine';

/** Type or paste an ingredient list and check it with the same engine as a scan. */
export default function ManualScreen() {
  const { barcode } = useLocalSearchParams<{ barcode?: string }>();
  const [text, setText] = useState('');
  const [halalLabel, setHalalLabel] = useState(false);
  const [veganLabel, setVeganLabel] = useState(false);

  const result = useMemo(() => {
    if (!text.trim()) return null;
    const labels = [...(halalLabel ? ['en:halal'] : []), ...(veganLabel ? ['en:vegan'] : [])];
    return evaluateProduct(barcode ?? null, { ingredientsText: text, labels });
  }, [barcode, text, halalLabel, veganLabel]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {barcode ? <Text style={styles.meta}>Barcode {barcode}</Text> : null}
        <Text style={styles.label}>Ingredients, as written on the pack</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="e.g. Sugar, glucose syrup, gelatine, citric acid, flavouring"
          multiline
          autoCorrect={false}
          autoCapitalize="none"
          textAlignVertical="top"
        />
        <View style={styles.row}>
          <Text style={styles.rowText}>Halal logo on the pack</Text>
          <Switch value={halalLabel} onValueChange={setHalalLabel} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Labelled vegan</Text>
          <Switch value={veganLabel} onValueChange={setVeganLabel} />
        </View>

        {result ? <ResultView result={result} /> : null}
        {result ? (
          <Text
            style={styles.link}
            accessibilityRole="link"
            onPress={() =>
              router.push({
                pathname: '/report',
                params: { barcode, verdict: VERDICT_STYLE[result.verdict].label, ingredients: text, problem: barcode ? 'Product is missing' : 'Verdict looks wrong' },
              })
            }
          >
            {barcode ? 'Send us this product' : 'Report a problem'}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, gap: 12 },
  meta: { fontSize: 13, color: '#888' },
  label: { fontSize: 16, fontWeight: '600' },
  input: { minHeight: 120, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontSize: 16 },
  link: { color: '#1a5fb4', fontSize: 15, textAlign: 'center', paddingVertical: 8 },
});
