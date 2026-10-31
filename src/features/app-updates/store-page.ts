import { Alert, Linking } from 'react-native';

export function openPlayStore() {
  void Linking.openURL('https://play.google.com/store/apps/details?id=az.nurvaxt.app').catch(() =>
    Alert.alert('Play Store açıla bilmədi', 'İnternet bağlantısını yoxlayın.'),
  );
}
