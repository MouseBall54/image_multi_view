export type BuildChannel = 'dev' | 'prod';

const readImportMetaEnv = (): Record<string, string> | undefined => {
  try {
    return (import.meta as unknown as { env?: Record<string, string> }).env;
  } catch (_error) {
    return undefined;
  }
};

const readProcessEnv = (): Record<string, string | undefined> | undefined => {
  if (typeof process === 'undefined') return undefined;
  return process.env as Record<string, string | undefined>;
};

export const getBuildChannel = (): BuildChannel => {
  const metaEnv = readImportMetaEnv();
  if (metaEnv) {
    const channel =
      metaEnv.VITE_BUILD_CHANNEL ??
      (metaEnv.MODE === 'production' ? 'prod' : 'dev');
    return channel === 'prod' ? 'prod' : 'dev';
  }

  const procEnv = readProcessEnv();
  if (procEnv) {
    const channel =
      procEnv.VITE_BUILD_CHANNEL ??
      procEnv.BUILD_CHANNEL ??
      (procEnv.NODE_ENV === 'production' ? 'prod' : 'dev');
    return channel === 'prod' ? 'prod' : 'dev';
  }

  return 'prod';
};

export const isDevChannel = (): boolean => getBuildChannel() !== 'prod';

export const isProdChannel = (): boolean => !isDevChannel();
