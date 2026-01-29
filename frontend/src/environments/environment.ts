const runtimeEnv =
  (typeof window !== 'undefined' && (window as any).__env) || ({} as any);

export const environment = {
  production: false,
  apiBaseUrl: runtimeEnv.apiBaseUrl || 'http://localhost:3000',
  googleApiKey: runtimeEnv.googleApiKey || '',
  googleClientId: runtimeEnv.googleClientId || '',
  firebase: {
    apiKey: runtimeEnv.firebase?.apiKey || '',
    authDomain: runtimeEnv.firebase?.authDomain || '',
    projectId: runtimeEnv.firebase?.projectId || '',
    appId: runtimeEnv.firebase?.appId || ''
  }
};
