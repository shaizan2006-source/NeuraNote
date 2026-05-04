'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ThemeMode } from '@/types/theme';
import styles from './theme-toggle.module.css';

export function ThemeToggle() {
  const { theme, setTheme, isLoading } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleThemeSelect = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  if (isLoading) {
    return <div className={styles.togglePlaceholder} />;
  }

  return (
    <div className={styles.themeToggleWrapper} ref={dropdownRef}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme menu"
        aria-expanded={isOpen}
      >
        {theme === 'gradient' && (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
        {theme === 'dark' && (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={`${styles.dropdownItem} ${theme === 'dark' ? styles.active : ''}`}
            onClick={() => handleThemeSelect('dark')}
          >
            <span className={styles.icon}>🌙</span>
            Dark Mode (Teal)
            {theme === 'dark' && <span className={styles.checkmark}>✓</span>}
          </button>

          <button
            className={`${styles.dropdownItem} ${styles.disabled}`}
            disabled
            title="Coming soon"
          >
            <span className={styles.icon}>☀️</span>
            Light Mode
            <span className={styles.badge}>Coming soon</span>
          </button>

          <button
            className={`${styles.dropdownItem} ${theme === 'gradient' ? styles.active : ''}`}
            onClick={() => handleThemeSelect('gradient')}
          >
            <span className={styles.icon}>🎨</span>
            Gradient Mode
            {theme === 'gradient' && <span className={styles.checkmark}>✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
