import { StatusBar, ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { useTheme } from './theme';
import { onMessageForeground } from './api/notifications';
import { useToast } from './context/ToastContext';
import { HomeScreen } from './pages/Home';
import UploadScreen from './pages/Upload';
import PhotoPreview from './pages/PhotoPreview';
import LoginScreen from './pages/Login';
import VaultaLogo from './components/VaultaLogo';
import AlbumsScreen from './pages/Albums';
import AlbumView from './pages/Albums/AlbumView';
import VaultView from './pages/Albums/VaultView';
import ProfileScreen from './pages/Profile';
import DuplicatesScreen from './pages/Duplicates';
import TrashScreen from './pages/Trash';
import ConnectionBanner from './components/ConnectionBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { registerFcmToken } from './api/notifications';
import type { TabParamList, StackParamList } from './types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<StackParamList>();

function tabBarIcon(
  { color, size }: { color: string; size: number },
  routeName: keyof TabParamList,
) {
  let iconName = '';
  if (routeName === 'Timeline') iconName = 'home';
  if (routeName === 'Albums') iconName = 'photo-album';
  return <Icon name={iconName} size={size} color={color} />;
}

function TabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }): BottomTabNavigationOptions => ({
        tabBarIcon: props =>
          tabBarIcon(props, route.name),
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
        },
      })}
    >
      <Tab.Screen
        name="Timeline"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Fotos',
          title: 'Fotos',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Tab.Screen
        name="Albums"
        component={AlbumsScreen}
        options={{
          tabBarLabel: 'Álbumes',
          title: 'Álbumes',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => { if (user) registerFcmToken() }, [user])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <VaultaLogo color={colors.text} />
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Upload"
        component={UploadScreen}
        options={{ title: 'Subir foto' }}
      />
      <Stack.Screen
        name="PhotoPreview"
        component={PhotoPreview}
        options={{
          title: 'Foto',
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: '#000' },
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Mi Perfil' }}
      />
      <Stack.Screen
        name="AlbumView"
        component={AlbumView}
        options={{ title: 'Álbum' }}
      />
      <Stack.Screen
        name="VaultView"
        component={VaultView}
        options={{ title: 'Caja Fuerte' }}
      />
      <Stack.Screen
        name="Duplicates"
        component={DuplicatesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Trash"
        component={TrashScreen}
        options={{ title: 'Papelera' }}
      />
    </Stack.Navigator>
  );
}

function NotificationHandler() {
  const { showToast } = useToast()

  useEffect(() => {
    const unsubscribe = onMessageForeground(message => {
      const body = message.notification?.body
      if (!body) return
      console.log('Push notification:', body)
      const isError = body.toLowerCase().includes('fall')
      showToast({ message: body, type: isError ? 'error' : 'success' })
    })
    return unsubscribe
  }, [showToast])

  return null
}

function AppContent() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ConnectionBanner />
      <AuthProvider>
        <ToastProvider>
          <NotificationHandler />
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ToastProvider>
      </AuthProvider>
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
