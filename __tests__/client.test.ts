jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

let mockKeychainStore: Record<string, string> = {};

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly' },
  getGenericPassword: jest.fn(({ service }: { service: string }) => {
    const password = mockKeychainStore[service];
    return Promise.resolve(password ? { username: 'auth', password } : false);
  }),
  setGenericPassword: jest.fn((_username: string, password: string, { service }: { service: string }) => {
    mockKeychainStore[service] = password;
    return Promise.resolve(true);
  }),
  resetGenericPassword: jest.fn(({ service }: { service: string }) => {
    delete mockKeychainStore[service];
    return Promise.resolve(true);
  }),
}));

jest.mock('../api/server', () => ({
  BASE_URL: 'http://test.local',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { setToken, clearToken, setRefreshToken, clearRefreshToken } from '../api/client';

// Import-time side effect (module-level, runs once above): `api/client`
// eagerly cleans up any plaintext token a pre-Keychain build of the app
// left in AsyncStorage. Asserted here, before any `beforeEach` below
// clears mock call history, since it only ever fires once per module load.
it('removes plaintext tokens left by the pre-Keychain version on import', () => {
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@vaulta_token');
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@vaulta_refresh_token');
});

describe('Client API', () => {
  beforeEach(() => {
    (Keychain.getGenericPassword as jest.Mock).mockClear();
    (Keychain.setGenericPassword as jest.Mock).mockClear();
    (Keychain.resetGenericPassword as jest.Mock).mockClear();
    mockKeychainStore = {};
  });

  it('should set and clear access token in Keychain', async () => {
    await setToken('test-token-123');
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'auth',
      expect.stringContaining('test-token-123'),
      expect.objectContaining({ service: 'vaulta.auth' }),
    );

    await clearToken();
    const lastCall = (Keychain.setGenericPassword as jest.Mock).mock.calls.at(-1);
    expect(JSON.parse(lastCall[1]).token).toBeNull();
  });

  it('should set and clear refresh token in Keychain', async () => {
    await setRefreshToken('rt-123');
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'auth',
      expect.stringContaining('rt-123'),
      expect.objectContaining({ service: 'vaulta.auth' }),
    );

    await clearRefreshToken();
    const lastCall = (Keychain.setGenericPassword as jest.Mock).mock.calls.at(-1);
    expect(JSON.parse(lastCall[1]).refreshToken).toBeNull();
  });

  it('preserves the refresh token when only the access token is updated', async () => {
    await setRefreshToken('rt-keep-me');
    await setToken('access-abc');
    const lastCall = (Keychain.setGenericPassword as jest.Mock).mock.calls.at(-1);
    const stored = JSON.parse(lastCall[1]);
    expect(stored.token).toBe('access-abc');
    expect(stored.refreshToken).toBe('rt-keep-me');
  });
});
