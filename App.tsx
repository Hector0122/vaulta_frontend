import {
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomeScreen } from './pages/Home';
import UploadScreen from './pages/Upload';
import PhotoPreview from './pages/PhotoPreview';
import LoginScreen from './pages/Login';
import AlbumsScreen from './pages/Albums';
import MapScreen from './pages/Map';
import ProfileScreen from './pages/Profile';

type TabParamList = {
  Timeline: undefined;
  Albums: undefined;
  Map: undefined;
};

type StackParamList = {
  Login: undefined;
  Main: { screen?: keyof TabParamList };
  Upload: undefined;
  PhotoPreview: {
    photos: { uri: string; id: string }[];
    initialIndex: number;
  };
  Profile: undefined;
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
  return <Icon name={iconName} size={size} color={color} />;
}

function TabNavigator() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <Tab.Navigator
      screenOptions={({ route }): BottomTabNavigationOptions => ({
        tabBarIcon: props =>
          tabBarIcon(props, route.name as keyof TabParamList),
        tabBarActiveTintColor: isDarkMode ? '#fff' : '#222',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Timeline" component={HomeScreen} />
      <Tab.Screen name="Albums" component={AlbumsScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}
      >
        <ActivityIndicator size="large" color="#222" />
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

  const isDarkMode = useColorScheme() === 'dark';
  return (
    <Stack.Navigator>
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
    </Stack.Navigator>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
