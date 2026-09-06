'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { storage, safeData } from '../lib/storage';
import { demoSeed, DEMO_MODELS, DEMO_PROVIDERS } from '../providers/demo';
import type { AppData, Model, Provider } from '../types';
type Update = (fn: (d: AppData) => AppData) => void;
interface Store {
  data: AppData;
  update: Update;
  ready: boolean;
  models: Model[];
  providers: Provider[];
  t: (zh: string, en: string) => string;
  storageError: string;
}
const Context = createContext<Store | null>(null);
const INITIAL = demoSeed(0);
export function AppStore({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(INITIAL);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const writeQueue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    storage
      .read<AppData>('state')
      .then((saved) => {
        if (!active) return;
        setData(saved && safeData(saved) ? saved : demoSeed());
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setData(demoSeed());
        setStorageError(
          '本地数据库不可用，刷新后数据可能丢失。 / Local storage unavailable. Changes may be lost on refresh.',
        );
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const update = useCallback<Update>((fn) => setData((d) => fn(d)), []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle('light', data.settings.theme === 'light');
    document.documentElement.classList.toggle('dark', data.settings.theme === 'dark');
    document.documentElement.lang = data.settings.language === 'zh' ? 'zh-CN' : 'en';
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(() => storage.write('state', data))
      .catch(() => {
        setStorageError('保存失败 / Storage write failed');
        toast.error('本地存储空间不足或不可用 / Local storage unavailable');
      });
  }, [data, ready]);
  const demo = data.settings.demo;
  const providers = demo ? DEMO_PROVIDERS : data.providers;
  const models = (demo ? DEMO_MODELS : data.models).filter(
    (m) => m.enabled && providers.some((p) => p.id === m.providerId && p.enabled),
  );
  const t = (zh: string, en: string) => (data.settings.language === 'zh' ? zh : en);
  return (
    <Context.Provider value={{ data, update, ready, models, providers, t, storageError }}>
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const c = useContext(Context);
  if (!c) throw new Error('AppStore missing');
  return c;
}
