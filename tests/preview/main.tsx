import { createRoot } from 'react-dom/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreviewProvider } from './mock-context';
import { usePath } from './router';
import ListScreen from '../../src/temporary-residents/ListScreen';
import FormScreen from '../../src/temporary-residents/FormScreen';
import ServerDetailScreen from '../../src/temporary-residents/ServerDetailScreen';
import ConflictScreen from '../../src/temporary-residents/ConflictScreen';
import NotificationsScreen from '../../src/notifications/NotificationsScreen';
function Preview() { const path = usePath(); return <SafeAreaProvider><PreviewProvider>{path === '/notifications' ? <NotificationsScreen /> : path.includes('/server/') ? <ServerDetailScreen /> : path.includes('/conflict/') ? <ConflictScreen /> : path.split('/').length > 2 ? <FormScreen /> : <ListScreen />}</PreviewProvider></SafeAreaProvider>; }
createRoot(document.getElementById('root')!).render(<Preview />);
