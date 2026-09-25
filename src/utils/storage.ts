import { Item, Pembelian, Penjualan, Pengeluaran, WorkshopConfig, ClosingPeriod } from '../types';
import {
  initialConfig,
  initialItems,
  initialPembelian,
  initialPenjualan,
  initialPengeluaran,
} from '../data/initialData';

const STORAGE_KEYS = {
  CONFIG: 'rycko_bengkel_config_v1',
  ITEMS: 'rycko_bengkel_items_v1',
  PEMBELIAN: 'rycko_bengkel_pembelian_v1',
  PENJUALAN: 'rycko_bengkel_penjualan_v1',
  PENGELUARAN: 'rycko_bengkel_pengeluaran_v1',
  CLOSING_HISTORY: 'rycko_bengkel_closing_history_v1',
};

export function loadStoredConfig(): WorkshopConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return initialConfig;
    const parsed = JSON.parse(raw);
    return { ...initialConfig, ...parsed };
  } catch (e) {
    console.error('Failed to load config from localStorage', e);
    return initialConfig;
  }
}

export function saveStoredConfig(config: WorkshopConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config to localStorage', e);
  }
}

export function loadStoredItems(): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) return initialItems;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialItems;
  } catch (e) {
    console.error('Failed to load items from localStorage', e);
    return initialItems;
  }
}

export function saveStoredItems(items: Item[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save items to localStorage', e);
  }
}

export function loadStoredPembelian(): Pembelian[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PEMBELIAN);
    if (!raw) return initialPembelian;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialPembelian;
  } catch (e) {
    console.error('Failed to load pembelian from localStorage', e);
    return initialPembelian;
  }
}

export function saveStoredPembelian(pembelian: Pembelian[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PEMBELIAN, JSON.stringify(pembelian));
  } catch (e) {
    console.error('Failed to save pembelian to localStorage', e);
  }
}

export function loadStoredPenjualan(): Penjualan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENJUALAN);
    if (!raw) return initialPenjualan;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialPenjualan;
  } catch (e) {
    console.error('Failed to load penjualan from localStorage', e);
    return initialPenjualan;
  }
}

export function saveStoredPenjualan(penjualan: Penjualan[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PENJUALAN, JSON.stringify(penjualan));
  } catch (e) {
    console.error('Failed to save penjualan to localStorage', e);
  }
}

export function loadStoredPengeluaran(): Pengeluaran[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENGELUARAN);
    if (!raw) return initialPengeluaran;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialPengeluaran;
  } catch (e) {
    console.error('Failed to load pengeluaran from localStorage', e);
    return initialPengeluaran;
  }
}

export function saveStoredPengeluaran(pengeluaran: Pengeluaran[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PENGELUARAN, JSON.stringify(pengeluaran));
  } catch (e) {
    console.error('Failed to save pengeluaran to localStorage', e);
  }
}

export function loadStoredClosingHistory(): ClosingPeriod[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLOSING_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load closing history from localStorage', e);
    return [];
  }
}

export function saveStoredClosingHistory(history: ClosingPeriod[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLOSING_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save closing history to localStorage', e);
  }
}

export function resetAllToDefault(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    localStorage.removeItem(STORAGE_KEYS.ITEMS);
    localStorage.removeItem(STORAGE_KEYS.PEMBELIAN);
    localStorage.removeItem(STORAGE_KEYS.PENJUALAN);
    localStorage.removeItem(STORAGE_KEYS.PENGELUARAN);
    localStorage.removeItem(STORAGE_KEYS.CLOSING_HISTORY);
  } catch (e) {
    console.error('Failed to reset localStorage', e);
  }
}
