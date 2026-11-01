import Constants from 'expo-constants';

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
export const SUPPORT_EMAIL = 'halalo.support@gmail.com';
export const GITHUB_REPO = 'https://github.com/Slackpartistic/Halal-O';

/** Open Food Facts asks every app to identify itself as "AppName/Version (contact email)". */
export const OFF_USER_AGENT = `Halal-O/${APP_VERSION} (${SUPPORT_EMAIL})`;

/** Stores need a public URL for the privacy policy; this works while the repo is public. */
export const PRIVACY_URL = `${GITHUB_REPO}/blob/main/docs/PRIVACY.md`;
