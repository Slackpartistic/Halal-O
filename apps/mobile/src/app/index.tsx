import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidBarcode } from '@halal-o/off-client';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  // Only one camera preview may be active, so it's mounted only while this screen is focused.
  const [focused, setFocused] = useState(true);
  const [typed, setTyped] = useState('');
  const handled = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      handled.current = false;
      return () => setFocused(false);
    }, []),
  );

  const open = (barcode: string) => {
    if (handled.current) return;
    handled.current = true;
    router.push({ pathname: '/product/[barcode]', params: { barcode } });
  };

  const onScanned = ({ data }: BarcodeScanningResult) => {
    const code = data.trim();
    if (isValidBarcode(code)) open(code);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Halal-O</Text>
      <Text style={styles.subtitle}>Point the camera at a product barcode</Text>

      <View style={styles.cameraBox}>
        {!permission ? null : permission.granted ? (
          focused && (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={onScanned}
            />
          )
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>Halal-O needs the camera to scan barcodes.</Text>
            {permission.canAskAgain ? (
              <Pressable style={styles.button} onPress={requestPermission}>
                <Text style={styles.buttonText}>Allow camera</Text>
              </Pressable>
            ) : (
              <Text style={styles.permissionText}>Turn on camera access for Halal-O in Settings.</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.manual}>
        <TextInput
          style={styles.input}
          value={typed}
          onChangeText={(t) => setTyped(t.replace(/\D/g, ''))}
          placeholder="Or type the barcode number"
          keyboardType="number-pad"
          returnKeyType="search"
          maxLength={14}
          onSubmitEditing={() => isValidBarcode(typed) && open(typed)}
        />
        <Pressable
          style={[styles.button, !isValidBarcode(typed) && styles.buttonDisabled]}
          disabled={!isValidBarcode(typed)}
          onPress={() => open(typed)}
        >
          <Text style={styles.buttonText}>Check</Text>
        </Pressable>
      </View>
      <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/manual')}>
        No barcode? Type the ingredients instead
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 15, color: '#555', marginTop: 4, marginBottom: 16 },
  cameraBox: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  manual: { flexDirection: 'row', gap: 8, paddingVertical: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 12, fontSize: 16, height: 48 },
  button: { backgroundColor: '#1b7f4b', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center', height: 48 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#1a5fb4', fontSize: 15, textAlign: 'center', paddingBottom: 16 },
});
