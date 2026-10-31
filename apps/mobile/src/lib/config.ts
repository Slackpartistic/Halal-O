import Constants from 'expo-constants';

const version = Constants.expoConfig?.version ?? '0.0.0';

/** Open Food Facts asks every app to identify itself as "AppName/Version (contact email)". */
export const OFF_USER_AGENT = `Halal-O/${version} (halalo.support@gmail.com)`;
