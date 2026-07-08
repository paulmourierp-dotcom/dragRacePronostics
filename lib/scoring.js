// Valeurs par défaut utilisées pour pré-remplir le barème de points modifiable
// depuis /admin à chaque épisode (voir ResultData.scoringRules) et le bonus couronne
// (voir CrownResultData.points).
export const SCORING_RULES = {
  miniDefi: 10,
  maxiDefi: 10,
  gagnante: 10,
  top: 5,
  safe: 2,
  bottom: 5,
  eliminee: 10,
  crown: 50
};

// Nombre max de Queens en top (resp. bottom) par défaut, tant que l'admin n'a rien configuré
// (voir ConfigData.maxTop/maxBottom, ResultData.maxTop/maxBottom).
export const DEFAULT_MAX_QUEENS = 3;