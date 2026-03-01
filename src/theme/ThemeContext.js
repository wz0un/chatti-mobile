import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
    const [currentTheme, setCurrentTheme] = useState(systemColorScheme === 'dark' ? darkColors : lightColors);

    useEffect(() => {
        loadThemeMode();
    }, []);

    useEffect(() => {
        if (themeMode === 'system') {
            setCurrentTheme(systemColorScheme === 'dark' ? darkColors : lightColors);
        } else {
            setCurrentTheme(themeMode === 'dark' ? darkColors : lightColors);
        }
    }, [themeMode, systemColorScheme]);

    const loadThemeMode = async () => {
        try {
            const savedMode = await AsyncStorage.getItem('themeMode');
            if (savedMode) {
                setThemeMode(savedMode);
            }
        } catch (error) {
            console.error('Error loading theme mode:', error);
        }
    };

    const updateThemeMode = async (mode) => {
        try {
            setThemeMode(mode);
            await AsyncStorage.setItem('themeMode', mode);
        } catch (error) {
            console.error('Error saving theme mode:', error);
        }
    };

    const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

    return (
        <ThemeContext.Provider value={{
            theme: currentTheme,
            themeMode,
            setThemeMode: updateThemeMode,
            isDark
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
