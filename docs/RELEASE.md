# Releasing Halal-O to testers

The app is built in the cloud with EAS, so you don't need a Mac.

## One-time setup (you)

1. **Accounts.**
   - An Expo account (free): https://expo.dev/signup
   - The Apple Developer Program (US$99 a year): https://developer.apple.com/programs/
   - A Google Play developer account (US$25 once): https://play.google.com/console/signup. New personal accounts must run a closed test with at least 12 testers for 14 days before going to production.
2. **Create halalo.support@gmail.com.** The stores, the privacy policy and the report flow all use it.
3. **Keep the repo public, or host the privacy policy elsewhere.** The stores need a public URL for `docs/PRIVACY.md`. If the repo becomes private, publish it with GitHub Pages and change `PRIVACY_URL` in `apps/mobile/src/lib/config.ts`.
4. **Install the EAS CLI and link the project** (from `apps/mobile`):
   ```bash
   npm install -g eas-cli
   eas login
   eas init          # writes the project ID into app.json; commit that change
   ```

## Build and send to testers

From `apps/mobile`:

```bash
# iOS: build, then upload to TestFlight (the first run asks for your Apple login and creates certificates)
eas build --platform ios --profile production
eas submit --platform ios --latest

# Android: build an .aab for Play
eas build --platform android --profile production
```

- **iOS:** in App Store Connect → TestFlight, add yourself and others as internal testers. Internal testing needs no Apple review.
- **Android:** the first upload to Play must be done by hand. In Play Console, create the app, go to Testing → Internal testing, create a release and upload the `.aab` from the EAS build page. After that, `eas submit --platform android --latest` works if you add a Google service account key (see https://docs.expo.dev/submit/android/).
- Build numbers go up automatically (`appVersionSource: remote` in `eas.json`). Change `version` in `app.json` for a new public version.

## Store listing answers

**App name:** Halal-O
**Subtitle (iOS, 30 chars):** Halal ingredient scanner
**Short description (Play, 80 chars):** Scan a food barcode to see if it's Halal, Haram or Mushbooh, and why.
**Category:** Food & Drink
**Bundle ID / package:** com.halalo.app
**Privacy policy URL:** https://github.com/Slackpartistic/Halal-O/blob/main/docs/PRIVACY.md
**Support email:** halalo.support@gmail.com

**Description:**
> Halal-O checks the ingredients of packaged food. Scan a barcode, or type the ingredients from the pack, and get a clear verdict: Halal, Haram or Mushbooh (doubtful). Every verdict shows the ingredients behind it, with the reason and a link to the source.
>
> • Rulings follow the Hanafi school, using a reviewed list of over 750 additives and ingredients, including E-numbers, emulsifiers, colourings and hidden animal or alcohol ingredients.
> • A halal logo or vegan label on the pack is taken into account.
> • Your scan history is kept on your phone, and you're told if a past product's verdict changes.
> • Report a wrong verdict in a couple of taps; every report is reviewed by hand.
> • No account, no ads, no tracking.
>
> Product data comes from Open Food Facts, the free open food database. Halal-O is a guide, not a fatwa or certification: when in doubt, check with the manufacturer, a recognised certifier or a scholar.

**Apple App Privacy:** "Data Not Collected". Product lookups go to Open Food Facts, not to us, and reports are sent by the user's own email or GitHub account.
**Apple export compliance:** no non-exempt encryption (set in `app.json`).
**Google Data safety:** no data collected or shared. Data is encrypted in transit (HTTPS). Users can't request deletion because nothing is stored off the device.
**Content rating:** answer the questionnaire; no objectionable content, so expect Everyone / 4+.

**Screenshots:** take them in Expo Go or a test build: scan screen, a Haram result with "Why", a Mushbooh result, History with a "verdict changed" badge, and the About screen. iOS needs 6.9" iPhone screenshots (1320 × 2868); Play needs at least 2 phone screenshots.
