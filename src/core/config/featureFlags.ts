export const featureFlags = {
  enableKDS: true,
  enableAI: false,
  enableAdvancedReports: true,
  enableInventoryAlerts: true,
  enableMultiLanguage: false,
};

export const isFeatureEnabled = (feature: keyof typeof featureFlags): boolean => {
  return featureFlags[feature] ?? false;
};
