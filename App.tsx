import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { HomeScreen } from './pages/Home';

type TabParamList = {
  Timeline: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function tabBarIcon({ color, size }: { color: string; size: number }, routeName: keyof TabParamList) {
  let iconName = '';
  if (routeName === 'Timeline') {
    iconName = 'home';
  } 
  
  return <Icon name={iconName} size={size} color={color} />;
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }): BottomTabNavigationOptions => ({
            tabBarIcon: (props) => tabBarIcon(props, route.name as keyof TabParamList),
            tabBarActiveTintColor: isDarkMode ? '#fff' : '#222',
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen name="Timeline" component={HomeScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}


export default App;
