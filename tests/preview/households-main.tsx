import { createRoot } from 'react-dom/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreviewProvider } from './mock-households';
import FormScreen from '../../src/households/FormScreen';
createRoot(document.getElementById('root')!).render(<SafeAreaProvider><PreviewProvider><FormScreen /></PreviewProvider></SafeAreaProvider>);
