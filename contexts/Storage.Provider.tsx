import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Storage schema - single source of truth for all persisted keys and their types
export type StorageSchema = {
  "ble.lastDeviceId": string | null;
  "ble.onboardingComplete": boolean;
};

// Default values for each key
const storageDefaults: StorageSchema = {
  "ble.lastDeviceId": null,
  "ble.onboardingComplete": false,
};

// All storage keys for preloading
const STORAGE_KEYS = Object.keys(storageDefaults) as (keyof StorageSchema)[];

type StorageContextType = {
  values: Partial<StorageSchema>;
  isLoaded: boolean;
  getValue: <K extends keyof StorageSchema>(key: K) => StorageSchema[K] | null;
  setValue: <K extends keyof StorageSchema>(
    key: K,
    value: StorageSchema[K],
  ) => Promise<void>;
  removeValue: <K extends keyof StorageSchema>(key: K) => Promise<void>;
};

const StorageContext = createContext<StorageContextType | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Partial<StorageSchema>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Preload all storage values on mount
  useEffect(() => {
    const loadStorage = async () => {
      try {
        const keys = STORAGE_KEYS.map((key) => key as string);
        const results = await AsyncStorage.multiGet(keys);

        const loaded: Record<string, StorageSchema[keyof StorageSchema]> = {};
        results.forEach(([key, value]) => {
          const typedKey = key as keyof StorageSchema;
          if (value !== null) {
            try {
              loaded[typedKey] = JSON.parse(value);
            } catch {
              // If JSON parse fails, treat as string (shouldn't happen with proper serialization)
              loaded[typedKey] = value as StorageSchema[keyof StorageSchema];
            }
          } else {
            // Use default value if nothing stored
            loaded[typedKey] = storageDefaults[typedKey];
          }
        });

        setValues(loaded);
      } catch (error) {
        console.error("[Storage] Failed to preload values:", error);
        // Fall back to defaults on error
        setValues({ ...storageDefaults });
      } finally {
        setIsLoaded(true);
      }
    };

    loadStorage();
  }, []);

  const getValue = useCallback(
    <K extends keyof StorageSchema>(key: K): StorageSchema[K] | null => {
      if (key in values) {
        return values[key] as StorageSchema[K];
      }
      return storageDefaults[key];
    },
    [values],
  );

  const setValue = useCallback(
    async <K extends keyof StorageSchema>(
      key: K,
      value: StorageSchema[K],
    ): Promise<void> => {
      try {
        const serialized = JSON.stringify(value);
        await AsyncStorage.setItem(key, serialized);
        setValues((prev) => ({ ...prev, [key]: value }));
      } catch (error) {
        console.error(`[Storage] Failed to set ${key}:`, error);
        throw error;
      }
    },
    [],
  );

  const removeValue = useCallback(
    async <K extends keyof StorageSchema>(key: K): Promise<void> => {
      try {
        await AsyncStorage.removeItem(key);
        setValues((prev) => ({ ...prev, [key]: storageDefaults[key] }));
      } catch (error) {
        console.error(`[Storage] Failed to remove ${key}:`, error);
        throw error;
      }
    },
    [],
  );

  return (
    <StorageContext.Provider
      value={{ values, isLoaded, getValue, setValue, removeValue }}
    >
      {children}
    </StorageContext.Provider>
  );
}

/**
 * Hook to access a specific storage value with full type safety
 * @param key - The storage key to access
 * @returns [value, setValue, isLoaded] tuple
 */
export function useStorage<K extends keyof StorageSchema>(
  key: K,
): [StorageSchema[K] | null, (value: StorageSchema[K]) => Promise<void>, boolean] {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider");
  }

  const { getValue, setValue, isLoaded } = context;

  const value = getValue(key);

  const setValueForKey = useCallback(
    (newValue: StorageSchema[K]) => setValue(key, newValue),
    [key, setValue],
  );

  return [value, setValueForKey, !isLoaded];
}

/**
 * Hook to access the full storage context (for advanced use cases)
 */
export function useStorageContext(): StorageContextType {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error("useStorageContext must be used within a StorageProvider");
  }

  return context;
}

