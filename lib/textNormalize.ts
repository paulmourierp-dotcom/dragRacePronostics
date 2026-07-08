// Normalise une reponse en texte libre pour la comparaison (accents, casse, espaces superflus)
// afin de tolerer les petites variantes de saisie entre l'utilisateur et la reponse de l'admin.
const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;
const DIACRITICS_REGEX = new RegExp(
  `[${String.fromCharCode(COMBINING_DIACRITICS_START)}-${String.fromCharCode(COMBINING_DIACRITICS_END)}]`,
  "g"
);

export const normalizeAnswer = (value: string): string =>
  value
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
