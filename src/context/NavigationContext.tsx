import { createContext, useContext, useRef, useCallback, useState, type ReactNode } from "react";

interface NavigationContextType {
  direction: number;
  setDirection: (d: number) => void;
  getNavIndex: (path: string) => number;
  navigateWithDirection: (targetPath: string, currentPath: string) => void;
}

const navOrder = [
  "/home", "/details", "/grades", "/scores", "/reports",
  "/exams", "/comments", "/dms", "/schedule", "/activities",
  "/diary", "/websites", "/settings",
];

const NavigationContext = createContext<NavigationContextType>({
  direction: 0,
  setDirection: () => {},
  getNavIndex: () => 0,
  navigateWithDirection: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [direction, setDirectionState] = useState(0);

  const setDirection = useCallback((d: number) => {
    setDirectionState(d);
  }, []);

  const getNavIndex = useCallback((path: string) => {
    const idx = navOrder.indexOf(path);
    return idx >= 0 ? idx : 0;
  }, []);

  const navigateWithDirection = useCallback((targetPath: string, currentPath: string) => {
    const from = navOrder.indexOf(currentPath);
    const to = navOrder.indexOf(targetPath);
    if (from >= 0 && to >= 0) {
      setDirection(to > from ? 1 : to < from ? -1 : 0);
    } else {
      setDirection(1);
    }
  }, [setDirection]);

  return (
    <NavigationContext.Provider value={{ direction, setDirection, getNavIndex, navigateWithDirection }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
