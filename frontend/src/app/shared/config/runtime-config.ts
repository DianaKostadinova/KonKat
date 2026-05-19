import { environment } from '../../../environments/environment';

/**
 * Runtime config bridge. Production deployments can override values without
 * rebuilding by setting `window.__KONKAT_CONFIG__` before the Angular bundle
 * loads (e.g. via a config script in index.html injected by the orchestrator).
 *
 * Falls back to the build-time `environment` object when nothing is injected.
 */
type KonkatConfig = {
  clerkPublishableKey?: string;
  apiUrl?: string;
  wsUrl?: string;
};

function injected(): KonkatConfig {
  if (typeof window === 'undefined') return {};
  return (window as any).__KONKAT_CONFIG__ ?? {};
}

export const runtimeConfig = {
  get clerkPublishableKey(): string {
    return injected().clerkPublishableKey || environment.clerkPublishableKey;
  },
  get apiUrl(): string {
    return injected().apiUrl || environment.apiUrl;
  },
  get wsUrl(): string {
    return injected().wsUrl || environment.wsUrl;
  },
};
