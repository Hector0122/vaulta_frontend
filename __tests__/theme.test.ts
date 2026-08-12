import { useTheme } from '../theme';
import { createAppTheme, brands } from '../tokens';

jest.mock('../context/ThemeContext', () => ({
  useThemeMode: jest.fn(),
}));

import { useThemeMode } from '../context/ThemeContext';

const { light: expectedLight, dark: expectedDark } = createAppTheme(brands.vaulta);

describe('useTheme', () => {
  it('should return light colors when isDark is false', () => {
    (useThemeMode as jest.Mock).mockReturnValue({ isDark: false });
    const { colors, isDark } = useTheme();
    expect(isDark).toBe(false);
    expect(colors.background).toBe(expectedLight.background);
    expect(colors.text).toBe(expectedLight.text);
    expect(colors.primary).toBe('#2BD4CE');
  });

  it('should return dark colors when isDark is true', () => {
    (useThemeMode as jest.Mock).mockReturnValue({ isDark: true });
    const { colors, isDark } = useTheme();
    expect(isDark).toBe(true);
    expect(colors.background).toBe(expectedDark.background);
    expect(colors.text).toBe(expectedDark.text);
    expect(colors.primary).toBe('#2BD4CE');
  });
});
