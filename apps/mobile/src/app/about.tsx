import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { APP_VERSION, GITHUB_REPO, PRIVACY_URL, SUPPORT_EMAIL } from '@/lib/config';
import { DISCLAIMER, VERDICT_HELP } from '@/lib/copy';
import { getCorrections, getReference } from '@/lib/engine';

const METHODOLOGY_URL = `${GITHUB_REPO}/blob/main/data/METHODOLOGY.md`;

function Link({ url, children }: { url: string; children: string }) {
  return (
    <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(url)}>
      {children}
    </Text>
  );
}

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>How verdicts work</Text>
      {VERDICT_HELP.map((v) => (
        <Text key={v.label} style={styles.body}>
          <Text style={styles.bold}>{v.label}: </Text>
          {v.text}
        </Text>
      ))}
      <Text style={styles.body}>
        Rulings follow the Hanafi school. Animal-derived ingredients count as not halal unless the pack has a halal logo, and an ingredient
        whose source the label doesn't give counts as Mushbooh. A vegan label is treated as halal; a vegetarian label is not.
      </Text>
      <Link url={METHODOLOGY_URL}>Read the full methodology and sources</Link>

      <Text style={styles.heading}>Disclaimer</Text>
      <Text style={styles.body}>{DISCLAIMER}</Text>

      <Text style={styles.heading}>Privacy</Text>
      <Text style={styles.body}>
        No account, no ads and no analytics. Your scan history stays on this phone. To look a product up, the barcode is sent to Open Food
        Facts. The camera is only used to read barcodes.
      </Text>
      <Link url={PRIVACY_URL}>Privacy policy</Link>

      <Text style={styles.heading}>Product data</Text>
      <Text style={styles.body}>
        Product names, photos and ingredients come from Open Food Facts, a free, open database built by volunteers and available under the
        Open Database License. You can add or fix a product on their website or app.
      </Text>
      <Link url="https://world.openfoodfacts.org">openfoodfacts.org</Link>
      <Link url="https://opendatacommons.org/licenses/odbl/1-0/">Open Database License (ODbL)</Link>

      <Text style={styles.heading}>Contact</Text>
      <Link url={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>

      <Text style={styles.meta}>
        Halal-O {APP_VERSION} · ingredient reference {getReference().generated} · corrections {getCorrections().version}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, backgroundColor: '#fff' },
  heading: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  body: { fontSize: 15, color: '#444', lineHeight: 21 },
  bold: { fontWeight: '700', color: '#222' },
  link: { fontSize: 15, color: '#1a5fb4', textDecorationLine: 'underline' },
  meta: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 20 },
});
