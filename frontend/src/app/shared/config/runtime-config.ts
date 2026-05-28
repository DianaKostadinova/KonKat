import { environment } from '../../../environments/environment';

type KonkatConfig = {
  apiUrl?: string;
  wsUrl?: string;
};

function injected(): KonkatConfig {
  if (typeof window === 'undefined') return {};
  return (window as any).__KONKAT_CONFIG__ ?? {};
}

export const runtimeConfig = {
  get apiUrl(): string {
    return injected().apiUrl || environment.apiUrl;
  },
  get wsUrl(): string {
    return injected().wsUrl || environment.wsUrl;
  },
};
