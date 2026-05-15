jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../api/server', () => ({
  BASE_URL: 'http://test.local',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToken, clearToken, setRefreshToken, clearRefreshToken } from '../api/client';

describe('Client API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set and clear access token in AsyncStorage', async () => {
    await setToken('test-token-123');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@mymega_token', 'test-token-123');

    await clearToken();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@mymega_token');
  });

  it('should set and clear refresh token in AsyncStorage', async () => {
    await setRefreshToken('rt-123');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@mymega_refresh_token', 'rt-123');

    await clearRefreshToken();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@mymega_refresh_token');
  });
});
