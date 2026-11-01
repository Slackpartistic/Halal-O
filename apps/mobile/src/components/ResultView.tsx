import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Reason, Result, Verdict } from '@halal-o/engine';
import { DISCLAIMER } from '@/lib/copy';
import { getReference } from '@/lib/engine';

export const VERDICT_STYLE: Record<Verdict, { label: string; color: string }> = {
  halal: { label: 'Halal', color: '#1b7f4b' },
  haram: { label: 'Haram', color: '#b3261e' },
  mushbooh: { label: 'Mushbooh', color: '#b26a00' },
  unknown: { label: 'Not enough information', color: '#5f6368' },
};


function subtitle(result: Result): string | null {
  if (result.correction) return `Checked by the Halal-O team on ${result.correction.reviewed}.`;
  if (result.certified) return 'Halal label reported on pack. Check the logo is from a certifier you trust.';
  if (result.verdict === 'unknown') return "We couldn't find an ingredient list for this product.";
  if (result.verdict === 'halal' && result.confidence !== 'high') return 'Likely halal: check the label.';
  if (result.verdict === 'mushbooh') return 'Doubtful: the label does not say where some ingredients come from.';
  return null;
}

export function VerdictBadge({ result }: { result: Result }) {
  const v = VERDICT_STYLE[result.verdict];
  const sub = subtitle(result);
  return (
    <View style={[styles.badge, { backgroundColor: v.color }]} accessibilityRole="header" accessibilityLabel={`Verdict: ${v.label}`}>
      <Text style={styles.badgeText}>{v.label}</Text>
      {sub ? <Text style={styles.badgeSub}>{sub}</Text> : null}
    </View>
  );
}

function ReasonCard({ reason }: { reason: Reason }) {
  const refs = getReference().references;
  const v = VERDICT_STYLE[reason.verdict];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{reason.ingredientText}</Text>
        <Text style={[styles.pill, { backgroundColor: v.color }]}>{v.label}</Text>
      </View>
      <Text style={styles.body}>{reason.rationale}</Text>
      {reason.upgradedByVeganLabel ? <Text style={styles.note}>Counted as halal because the pack has a vegan label.</Text> : null}
      {reason.origin ? <Text style={styles.note}>Source on label: {reason.origin.replace(/_/g, ' ')}.</Text> : null}
      {reason.contested ? <Text style={styles.note}>Other views: {reason.contested}</Text> : null}
      {reason.refs.map((id) => {
        const ref = refs[id];
        return ref ? (
          <Text key={id} style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(ref.url)}>
            {ref.title}
          </Text>
        ) : null;
      })}
    </View>
  );
}

function Collapsible({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={styles.cardTitle}>
          {open ? '▾' : '▸'} {title} ({items.length})
        </Text>
      </Pressable>
      {open ? <Text style={styles.body}>{items.join(', ')}</Text> : null}
    </View>
  );
}

/** Everything below the product header: verdict, why, what was assumed, and the disclaimer. */
export function ResultView({ result }: { result: Result }) {
  const flagged = result.reasons.filter((r) => r.verdict !== 'halal');
  const upgraded = result.reasons.filter((r) => r.verdict === 'halal');
  return (
    <View style={styles.container}>
      <VerdictBadge result={result} />
      {result.correction ? (
        <View style={[styles.card, styles.correction]}>
          <Text style={styles.cardTitle}>Reviewed after a report</Text>
          <Text style={styles.body}>{result.correction.note}</Text>
          {result.correction.issue ? (
            <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(result.correction!.issue!)}>
              See the report
            </Text>
          ) : null}
          <Text style={styles.note}>The ingredient check below is shown for reference; this review replaces its verdict.</Text>
        </View>
      ) : null}

      {flagged.length > 0 ? (
        <>
          <Text style={styles.section}>{result.certified ? 'Would otherwise be flagged' : 'Why'}</Text>
          {flagged.map((r, i) => (
            <ReasonCard key={`f${i}`} reason={r} />
          ))}
        </>
      ) : null}
      {upgraded.map((r, i) => (
        <ReasonCard key={`u${i}`} reason={r} />
      ))}

      <Collapsible title="Assumed halal" items={result.assumedHalal} />
      <Collapsible title="Not checked (plain foods we don't list)" items={result.notChecked} />

      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  badge: { borderRadius: 14, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  badgeSub: { color: '#fff', fontSize: 14, marginTop: 6, textAlign: 'center' },
  section: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  card: { borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 12, padding: 12, gap: 6 },
  correction: { borderColor: '#1a5fb4', backgroundColor: '#eef4fb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  pill: { color: '#fff', fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  body: { fontSize: 15, color: '#444' },
  note: { fontSize: 13, color: '#666' },
  link: { fontSize: 13, color: '#1a5fb4', textDecorationLine: 'underline' },
  disclaimer: { fontSize: 12, color: '#777', textAlign: 'center', marginTop: 8 },
});
