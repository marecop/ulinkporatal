import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider } from './context/NavigationContext';
import App from './App.tsx';
import './index.css';

window.addEventListener('beforeunload', () => {
  sessionStorage.removeItem('activitiesData');
  sessionStorage.removeItem('timetableData');
  sessionStorage.removeItem('examsData');
  sessionStorage.removeItem('examsAutoSyncAt');
});

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <NavigationProvider>
      <App />
    </NavigationProvider>
  </ThemeProvider>,
);
