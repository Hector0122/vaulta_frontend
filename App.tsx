import { StatusBar, ActivityIndicator, View } from 'react-native';
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
import { useTheme } from './theme';
import { HomeScreen } from './pages/Home';
import UploadScreen from './pages/Upload';
import PhotoPreview from './pages/PhotoPreview';
import LoginScreen from './pages/Login';
import AlbumsScreen from './pages/Albums';
import MapScreen from './pages/Map';
import ProfileScreen from './pages/Profile';
import DuplicatesScreen from './pages/Duplicates';
import ConnectionBanner from './components/ConnectionBanner';

type TabParamList = {
  Timeline: undefined;
  Albums: undefined;
  Map: undefined;
};

type StackParamList = {
  Login: undefined;
  Main: { screen?: keyof TabParamList };
  Upload: { imageUri?: string };
  PhotoPreview: {
    photos: { uri: string; id: string }[];
    initialIndex: number;
  };
  Profile: undefined;
  Duplicates: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<StackParamList>();

function tabBarIcon(
  { color, size }: { color: string; size: number },
  routeName: keyof TabParamList,
) {
  let iconName = '';
  if (routeName === 'Timeline') iconName = 'home';
  if (routeName === 'Albums') iconName = 'photo-album';
  if (routeName === 'Map') iconName = 'map';
  return <Icon name={iconName} size={size} color={color} />;
}

function TabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }): BottomTabNavigationOptions => ({
        tabBarIcon: props =>
          tabBarIcon(props, route.name as keyof TabParamList),
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
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Mapa',
          title: 'Mapa',
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

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
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
        name="Duplicates"
        component={DuplicatesScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ConnectionBanner />
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
