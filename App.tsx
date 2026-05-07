import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { HomeScreen } from './pages/Home';
import UploadScreen from './pages/Upload';
import PhotoPreview from './pages/PhotoPreview';

type TabParamList = {
  Timeline: undefined;
};

type StackParamList = {
  Main: undefined;
  Upload: undefined;
  PhotoPreview: { thumbnailUri: string; filename: string };
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<StackParamList>();

function tabBarIcon({ color, size }: { color: string; size: number }, routeName: keyof TabParamList) {
  let iconName = '';
  if (routeName === 'Timeline') {
    iconName = 'home';
  } 
  
  return <Icon name={iconName} size={size} color={color} />;
}

function TabNavigator() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <Tab.Navigator
      screenOptions={({ route }): BottomTabNavigationOptions => ({
        tabBarIcon: (props) => tabBarIcon(props, route.name as keyof TabParamList),
        tabBarActiveTintColor: isDarkMode ? '#fff' : '#222',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Timeline" component={HomeScreen} />
    </Tab.Navigator>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'Subir foto' }} />
          <Stack.Screen name="PhotoPreview" component={PhotoPreview} options={{ title: 'Foto', headerTintColor: '#fff', headerStyle: { backgroundColor: '#000' } }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}


export default App;
