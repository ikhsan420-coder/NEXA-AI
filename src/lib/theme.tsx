import { createContext, useContext } from 'react';
import type { ThemeMode } from '../types';

export const ThemeContext = createContext<ThemeMode>('dark');
export const useTheme = (): ThemeMode => useContext(ThemeContext);
