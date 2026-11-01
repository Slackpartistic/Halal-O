/** Wording shared by the welcome screen, About and every result. */
export const DISCLAIMER =
  'This app checks ingredients against a reference list following Hanafi rulings. It is not a fatwa or certification. ' +
  'When a product is Mushbooh or you are unsure, check with the manufacturer, a recognised halal certifier, or a scholar.';

/** Bump when the welcome text changes in a way people should read again. */
export const DISCLAIMER_VERSION = '1';

export const VERDICT_HELP: { label: string; text: string }[] = [
  { label: 'Halal', text: 'No ingredient we know of is a problem, or the pack has a halal logo.' },
  { label: 'Haram', text: 'At least one ingredient is not permissible, such as pork gelatine, alcohol or animal rennet.' },
  { label: 'Mushbooh', text: 'Doubtful: an ingredient could come from a halal or a haram source and the label does not say which.' },
];
