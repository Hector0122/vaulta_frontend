import { StatusBar, ActivityIndicator, View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
import { promptBiometrics } from './services/biometrics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
import PeopleScreen from './pages/People';
import PersonView from './pages/People/PersonView';
import ConnectionBanner from './components/ConnectionBanner';

import ErrorBoundary from './components/ErrorBoundary';
import { NetworkProvider } from './context/NetworkContext';
import { updateWidgetWithRecentPhotos, pruneWidgetPhotos } from './api/widget';
import { registerFcmToken } from './api/notifications';
import { runAutoSync } from './api/autoSync';
import { cleanupPrivateFaces } from './api/client';
import type { TabParamList, StackParamList } from './types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<StackParamList>();

function tabBarIcon(
  { color, size }: { color: string; size: number },
  routeName: keyof TabParamList,
) {
  let iconName = '';
  if (routeName === 'Timeline') iconName = 'home-variant';
  if (routeName === 'Albums') iconName = 'image-multiple-outline';
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

function BiometricGate() {
  const { handleBiometricSuccess, dismissBiometricGate, biometricLabel } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    ;(async () => {
      const ok = await promptBiometrics('Desbloquea ' + (biometricLabel || 'Vaulta'))
      if (ok) {
        handleBiometricSuccess()
      } else {
        dismissBiometricGate()
      }
    })()
  }, [handleBiometricSuccess, dismissBiometricGate, biometricLabel])

  return (
    <View style={[biometricStyles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[biometricStyles.text, { color: colors.textSecondary }]}>
        Verificando identidad…
      </Text>
    </View>
  )
}

const biometricStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { fontSize: 16 },
})

function AppNavigator() {
  const { user, loading, biometricNeeded } = useAuth();
  const { colors } = useTheme();

  const appState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    if (user && !biometricNeeded) {
      registerFcmToken()
      pruneWidgetPhotos()
      cleanupPrivateFaces().catch(() => {})
      updateWidgetWithRecentPhotos()
    }
  }, [user, biometricNeeded])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        runAutoSync().catch(() => {})
      }
      appState.current = nextState
    })
    return () => subscription.remove()
  }, [])

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <VaultaLogo color={colors.text} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />
      </View>
    );
  }

  if (biometricNeeded && user) {
    return <BiometricGate />
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
        contentStyle: { backgroundColor: colors.background },
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
        options={{ title: 'Duplicados' }}
      />
      <Stack.Screen
        name="Trash"
        component={TrashScreen}
        options={{ title: 'Papelera' }}
      />
      <Stack.Screen
        name="People"
        component={PeopleScreen}
        options={{ title: 'Personas' }}
      />
      <Stack.Screen
        name="PersonView"
        component={PersonView}
        options={{ title: 'Persona' }}
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
      <NetworkProvider>
        <ConnectionBanner />
        <AuthProvider>
          <ToastProvider>

            <NotificationHandler />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </ToastProvider>
        </AuthProvider>
      </NetworkProvider>
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
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

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingSpinner: { marginTop: 32 },
  root: { flex: 1 },
})

export default App;
