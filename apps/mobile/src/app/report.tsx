import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { emailUrl, githubIssueUrl, PROBLEMS, type Problem, type Report } from '@/lib/report';

type Params = { barcode?: string; product?: string; verdict?: string; ingredients?: string; problem?: string };

/** Report a wrong verdict, a halal logo, stale ingredients or a missing product (docs/SPEC.md §2.4). */
export default function ReportScreen() {
  const p = useLocalSearchParams<Params>();
  const initial = PROBLEMS.find((x) => x === p.problem) ?? (p.verdict ? 'Verdict looks wrong' : 'Product is missing');
  const [problem, setProblem] = useState<Problem>(initial);
  const [details, setDetails] = useState('');

  const report: Report = {
    problem,
    details: details.trim(),
    barcode: p.barcode || undefined,
    product: p.product || undefined,
    appVerdict: p.verdict || undefined,
    ingredients: p.ingredients || undefined,
  };
  const ready = report.details.length > 0;

  const open = async (url: string, what: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Couldn't open ${what}`, 'You can also email halalo.support@gmail.com directly.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {report.product || report.barcode ? (
          <Text style={styles.meta}>{[report.product, report.barcode && `Barcode ${report.barcode}`].filter(Boolean).join(' · ')}</Text>
        ) : null}

        <Text style={styles.label}>What's the problem?</Text>
        <View style={styles.options} accessibilityRole="radiogroup">
          {PROBLEMS.map((x) => (
            <Pressable
              key={x}
              style={[styles.option, x === problem && styles.optionOn]}
              onPress={() => setProblem(x)}
              accessibilityRole="radio"
              accessibilityState={{ checked: x === problem }}
            >
              <Text style={[styles.optionText, x === problem && styles.optionTextOn]}>{x}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={styles.input}
          value={details}
          onChangeText={setDetails}
          placeholder={
            problem === 'Halal logo on pack'
              ? 'Which certifier? e.g. HMC, HFA'
              : 'What should it say, and why? e.g. "The E471 is labelled as plant-based."'
          }
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.hint}>Photos of the ingredient list and any halal logo help the most. You can add them in the next step.</Text>

        <Pressable style={[styles.button, !ready && styles.disabled]} disabled={!ready} onPress={() => open(emailUrl(report), 'your email app')}>
          <Text style={styles.buttonText}>Send by email</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary, !ready && styles.disabled]}
          disabled={!ready}
          onPress={() => open(githubIssueUrl(report), 'GitHub')}
        >
          <Text style={[styles.buttonText, styles.secondaryText]}>Report on GitHub</Text>
        </Pressable>
        <Text style={styles.hint}>Every report is checked by hand. If we change a verdict, it shows in your History.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, gap: 12 },
  meta: { fontSize: 14, color: '#666' },
  label: { fontSize: 16, fontWeight: '600' },
  options: { gap: 8 },
  option: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12 },
  optionOn: { borderColor: '#1b7f4b', backgroundColor: '#e8f4ed' },
  optionText: { fontSize: 15 },
  optionTextOn: { color: '#1b7f4b', fontWeight: '600' },
  input: { minHeight: 110, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 16 },
  hint: { fontSize: 13, color: '#777' },
  button: { backgroundColor: '#1b7f4b', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1b7f4b' },
  secondaryText: { color: '#1b7f4b' },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
