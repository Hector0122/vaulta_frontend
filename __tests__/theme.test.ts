import { useTheme } from '../theme';

jest.mock('../context/ThemeContext', () => ({
  useThemeMode: jest.fn(),
}));

import { useThemeMode } from '../context/ThemeContext';

describe('useTheme', () => {
  it('should return light colors when isDark is false', () => {
    (useThemeMode as jest.Mock).mockReturnValue({ isDark: false });
    const { colors, isDark } = useTheme();
    expect(isDark).toBe(false);
    expect(colors.background).toBe('#fff');
    expect(colors.text).toBe('#222');
    expect(colors.primary).toBe('#2BD4CE');
  });

  it('should return dark colors when isDark is true', () => {
    (useThemeMode as jest.Mock).mockReturnValue({ isDark: true });
    const { colors, isDark } = useTheme();
    expect(isDark).toBe(true);
    expect(colors.background).toBe('#121212');
    expect(colors.text).toBe('#e0e0e0');
    expect(colors.primary).toBe('#2BD4CE');
  });
});
