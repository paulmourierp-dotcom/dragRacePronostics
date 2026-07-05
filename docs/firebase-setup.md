# Configuration Firebase — Pronostics & Résultats

Ce document décrit ce qu'il faut configurer manuellement dans la console Firebase (Firestore) pour l'architecture de pronostics/résultats/score. Il couvre l'existant et les ajouts liés à `results`, `crownPredictions` et `config/crown_result`.

## 1. Vue d'ensemble des collections

| Collection / doc | Écrit par | Créé comment | Rôle |
|---|---|---|---|
| `users/{uid}` | user (profil) + admin (score) | déjà en place | Profil joueur, score total |
| `config/next_episode` | admin | déjà en place | Épisode en cours de pronostic (`numero`, `dateDiffusion`) |
| `config/crown_result` | admin | auto-créé par le panel `/admin` (`setDoc`) | Gagnante réelle de la saison, une fois connue |
| `game-data/{id}` | admin | déjà en place | Queens (nom + statut éliminée) / mini-défis / maxi-défis |
| `predictions/{uid}_ep{numero}` | user | auto-créé au 1er `setDoc` | Pronostics hebdo d'un joueur pour un épisode |
| `results/{numero}` | admin | auto-créé au 1er `setDoc` | Résultats officiels d'un épisode (fait foi pour le score) |
| `crownPredictions/{uid}` | user | auto-créé au 1er `setDoc` | Pronostic saison ("qui gagnera la couronne") |

Point important : Firestore est schemaless. Tu n'as **rien à créer dans la console** pour `predictions`, `results`, `crownPredictions` et `config/crown_result` — ces documents apparaissent tout seuls dès le premier `setDoc`/`addDoc` exécuté par l'app (le panel `/admin` a maintenant une section "Gagnante de la saison" qui fait un `setDoc` sur `config/crown_result`). Seul `config/next_episode` doit être créé à la main, car rien dans le code ne l'initialise (l'app ne fait que le lire/mettre à jour).

## 2. Documents à créer manuellement (Firestore > Data)

### `config/next_episode` (déjà fait normalement)
```
numero: 1              // number
dateDiffusion: <timestamp>   // Timestamp — choisis un type "timestamp" dans la console, pas "string"
```

Aucune autre création manuelle n'est nécessaire.

## 3. Format attendu des documents auto-créés

Pour référence (ça correspond aux types dans `types/`) :

**`game-data/{id}.queens`** (`types/gameData.ts`, `QueenData[]`)
```
[{ name: string, eliminee: boolean }, ...]
```
`name` doit correspondre exactement au nom de fichier dans `public/` (sans l'extension), ex. `"LaHarpie"` → `public/LaHarpie.jpeg`, utilisé pour afficher la photo de la Queen sur `/pronostics`. Ancien format (`string[]`) toujours accepté en lecture via `lib/queens.ts#normalizeQueens` (les Queens sont alors considérées non éliminées), mais converti au nouveau format dès la prochaine sauvegarde depuis `/admin`.

**`predictions/{uid}_ep{numero}`** (`types/prediction.ts`)
```
userId: string
episodeId: number
queensResults: { [nomQueen]: "top" | "bottom" | "safe" }
winner: string | null
eliminee: string | null
miniDefi: string | null           // choisi parmi game-data.minidefis
maxiDefi: string | null           // choisi parmi game-data.maxidefis
pointsEarned: number | undefined   // rempli par l'admin après validation des résultats
updatedAt: Date
```

**`results/{numero}`** (`types/result.ts`, doc ID = le numéro d'épisode, ex. `"5"`)
```
numero: number
top: [string, string]
bottom: [string, string]
eliminee: string
winner: string
miniDefi: string
maxiDefi: string
scoringRules: { top, bottom, safe, gagnante, eliminee, miniDefi, maxiDefi: number }
publishedAt: Timestamp
```
Saisi depuis `/admin` (section "Résultats de l'épisode", même tableau que `/pronostics`, plus un barème de points modifiable épisode par épisode — pré-rempli avec `SCORING_RULES` de `lib/scoring.js` par défaut). À l'enregistrement : la Queen `eliminee` est automatiquement marquée `eliminee: true` dans `game-data.queens`, et `pointsEarned` est recalculé (avec le `scoringRules` propre à CET épisode, pas un barème global) pour tous les `predictions` de cet épisode, puis `users/{uid}.score` est resommé pour chaque joueur concerné (somme de tous ses `pointsEarned`, épisodes + couronne — pas un increment, recalcul complet à chaque validation, voir `recomputeUserScore` dans `app/admin/page.tsx`).

**`crownPredictions/{uid}`** (`types/crown.ts`, doc ID = uid du joueur)
```
userId: string
queenPredicted: string
createdAt: Timestamp
pointsEarned?: number         // rempli par l'admin quand la gagnante de la saison est déclarée
```

**`config/crown_result`** (`types/crown.ts`, `CrownResultData`)
```
locked: boolean              // coché depuis /admin, bloque l'écriture de crownPredictions
points?: number               // points attribués si bien deviné, modifiable depuis /admin (défaut : SCORING_RULES.crown = 50)
winner?: string               // renseigné uniquement une fois la saison terminée
publishedAt?: Timestamp
```

## 4. Règles de sécurité Firestore

À coller dans **Firestore Database > Rules** dans la console. Ce bloc part de ce que le code actuel présuppose (users peuvent lire tout le monde pour le classement, admin identifié par `users/{uid}.role == "admin"`) et intègre la règle de deadline sur `predictions` restée en attente depuis le passage de `dateDiffusion` en Timestamp.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
    }

    match /config/{docId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /game-data/{docId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /predictions/{predictionId} {
      allow read: if isSignedIn() &&
        (resource.data.userId == request.auth.uid || isAdmin());

      // Un joueur ne peut créer/modifier que son propre pronostic, et seulement
      // avant la diffusion de l'épisode. L'admin peut toujours écrire (ex. pointsEarned).
      allow create, update: if isSignedIn() && (
        isAdmin() ||
        (request.resource.data.userId == request.auth.uid &&
         get(/databases/$(database)/documents/config/next_episode).data.dateDiffusion > request.time)
      );
    }

    match /results/{numero} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /crownPredictions/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create, update: if isSignedIn() && request.auth.uid == userId && !(
        exists(/databases/$(database)/documents/config/crown_result) &&
        get(/databases/$(database)/documents/config/crown_result).data.locked == true
      );
    }
  }
}
```

Le verrou des pronostics couronne (`crownPredictions`) ne dépend plus de `next_episode` (qui change chaque semaine et ne représente pas le début de saison) : c'est une checkbox dédiée dans `/admin` (section "Gagnante de la saison"), qui écrit `locked: true/false` dans `config/crown_result`. La règle ci-dessus vérifie explicitement que le document existe avant de lire `.data.locked` — sans ce `exists()`, tant que l'admin n'a jamais ouvert cette section, `config/crown_result` n'existerait pas et la règle bloquerait tout le monde par erreur.

## 5. Index Firestore

Rien à créer à l'avance. Si tu ajoutes plus tard une requête combinant un filtre et un tri (ex. `where("episodeId", "==", numero)` + `orderBy("pointsEarned")`), Firestore refusera la requête au runtime avec un message contenant un **lien direct** pour créer l'index composite en un clic — inutile de le préconfigurer maintenant.

## 6. Ordre des opérations recommandé pour la mise en prod

1. Coller les règles de sécurité ci-dessus (§4) dans la console.
2. Vérifier/créer `config/next_episode` (déjà fait).
3. Ne rien créer pour `results`, `predictions`, `crownPredictions`, `config/crown_result` — l'app s'en charge au premier écrit (le dernier, une fois la saison terminée, via le panel `/admin`).
