import React, { useState, useEffect } from 'react';
import './ThemeToggle.css';

const ThemeToggle = () => {
  // Initialize state from localStorage or default to 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Effect to apply the theme and save it to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handler to toggle the theme
  const handleToggle = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <label className="toggle-switch">
      <input 
        type="checkbox" 
        checked={theme === 'dark'} 
        onChange={handleToggle} 
      />
      <span className="slider"></span>
    </label>
  );
};

export default ThemeToggle;