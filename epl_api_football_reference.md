# API-Football (api-sports.io) — EPL Match Endpoints Reference

## Base URL

```
https://v3.football.api-sports.io
```

## Required Headers (every request)

```
x-apisports-key: <your key>
```

## Rate Limits (Free Tier)

- 100 requests / day
- 10 requests / minute
- Each analysis pipeline = **2 calls** (list fixtures + 1 call per fixture detail)
- Caching means each match is only ever fetched once

---

## 1. List Finished EPL Matches

### Endpoint

```
GET /fixtures?league=39&season=2024&status=FT
```

- `league=39` — Premier League
- `season=2024` — the 2024/25 season (API-Football uses start year)
- `status=FT` — finished matches (Premier League is a league format, no extra time or penalties)
- Returns **380 fixtures** for a full season

### Response shape (per fixture)

```json
{
  "fixture": {
    "id": 1208021,
    "referee": "R. Jones",
    "date": "2024-08-16T19:00:00+00:00",
    "venue": { "id": 556, "name": "Old Trafford", "city": "Manchester" },
    "status": { "long": "Match Finished", "short": "FT", "elapsed": 90 }
  },
  "league": {
    "id": 39,
    "name": "Premier League",
    "season": 2024,
    "round": "Regular Season - 1"
  },
  "teams": {
    "home": { "id": 33, "name": "Manchester United", "winner": true },
    "away": { "id": 36, "name": "Fulham", "winner": false }
  },
  "goals": { "home": 1, "away": 0 },
  "score": {
    "halftime": { "home": 0, "away": 0 },
    "fulltime": { "home": 1, "away": 0 },
    "extratime": { "home": null, "away": null },
    "penalty": { "home": null, "away": null }
  }
}
```

---

## 2. Full Fixture Detail — 1 call per match

### Endpoint

```
GET /fixtures?id=1208021
```

Returns **everything in one response**: events, statistics, lineups, and per-player stats.

### (a) Events

Under `response[0].events`:

```json
[
  {
    "time": { "elapsed": 18, "extra": null },
    "team": { "id": 33, "name": "Manchester United" },
    "player": { "id": 19220, "name": "Mason Mount" },
    "assist": { "id": null, "name": null },
    "type": "Card",
    "detail": "Yellow Card",
    "comments": "Foul"
  },
  {
    "time": { "elapsed": 87, "extra": null },
    "team": { "id": 33, "name": "Manchester United" },
    "player": { "id": 70100, "name": "J. Zirkzee" },
    "assist": { "id": 284324, "name": "A. Garnacho" },
    "type": "Goal",
    "detail": "Normal Goal",
    "comments": null
  },
  {
    "time": { "elapsed": 61, "extra": null },
    "team": { "id": 33, "name": "Manchester United" },
    "player": { "id": 157997, "name": "A. Diallo" },
    "assist": { "id": 284324, "name": "A. Garnacho" },
    "type": "subst",
    "detail": "Substitution 1",
    "comments": null
  }
]
```

**Event types:**
- `"Goal"` — details: `"Normal Goal"`, `"Own Goal"`, `"Penalty"`
- `"Card"` — details: `"Yellow Card"`, `"Red Card"`, `"Yellow Red Card"`
- `"subst"` — player out = `player.name`, player in = `assist.name`

### (b) Statistics

Under `response[0].statistics` — array of two objects (one per team):

```json
[
  {
    "team": { "id": 33, "name": "Manchester United" },
    "statistics": [
      { "type": "Shots on Goal",    "value": 5 },
      { "type": "Shots off Goal",   "value": 7 },
      { "type": "Total Shots",      "value": 14 },
      { "type": "Blocked Shots",    "value": 2 },
      { "type": "Shots insidebox",  "value": 7 },
      { "type": "Shots outsidebox", "value": 7 },
      { "type": "Fouls",            "value": 12 },
      { "type": "Corner Kicks",     "value": 7 },
      { "type": "Offsides",         "value": 3 },
      { "type": "Ball Possession",  "value": "55%" },
      { "type": "Yellow Cards",     "value": 2 },
      { "type": "Red Cards",        "value": null },
      { "type": "Goalkeeper Saves", "value": 2 },
      { "type": "Total passes",     "value": 482 },
      { "type": "Passes accurate",  "value": 408 },
      { "type": "Passes %",         "value": "85%" },
      { "type": "expected_goals",   "value": "2.43" },
      { "type": "goals_prevented",  "value": 1 }
    ]
  }
]
```

**Notes:**
- `Ball Possession` and `Passes %` are strings with `%` suffix — strip before parsing
- `expected_goals` is a string — parse as float
- `Red Cards` can be `null` (means 0)

### (c) Lineups

Under `response[0].lineups` — array of two objects (one per team):

```json
{
  "team": { "id": 33, "name": "Manchester United" },
  "coach": { "id": 1993, "name": "E. ten Hag" },
  "formation": "4-2-3-1",
  "startXI": [
    { "player": { "id": 526, "name": "A. Onana", "number": 24, "pos": "G", "grid": "1:1" } }
  ],
  "substitutes": [
    { "player": { "id": 284324, "name": "A. Garnacho", "number": 17, "pos": "F", "grid": null } }
  ]
}
```

### (d) Player statistics

Under `response[0].players` — per-player stats including ratings, goals, assists, shots, passes, tackles, duels, cards.

```json
{
  "player": { "id": 70100, "name": "Joshua Zirkzee" },
  "statistics": [{
    "games": { "minutes": 29, "position": "F", "rating": "7.3", "substitute": true },
    "goals": { "total": 1, "assists": 0, "saves": null },
    "shots": { "total": 1, "on": 1 },
    "passes": { "total": 9, "key": null, "accuracy": "8" },
    "cards": { "yellow": 0, "red": 0 }
  }]
}
```

---

## Signals Available for Preprocessor

From these 2 calls (list + per-fixture detail) we can extract:

| Signal | Source |
|---|---|
| Full time score | fixture list / detail |
| Half time score | fixture list / detail |
| Extra time / penalty score | fixture list / detail |
| Score margin + result type | derived |
| Second half goals per team | derived from events |
| Goal scorers + minutes | events |
| Assist names | events |
| Goal types (normal / penalty / own goal) | events |
| Yellow / red cards + minutes + team | events |
| Substitution timing | events |
| Possession % per team | statistics |
| Shots on/off target, total, inside/outside box | statistics |
| Corners, fouls, offsides | statistics |
| Pass count + accuracy % | statistics |
| xG per team | statistics |
| Goalkeeper saves | statistics |
| Formation per team | lineups |
| Starting XI + substitutes | lineups |
| Per-player rating | players |
| Per-player goals / assists / shots / passes / cards | players |

---

## Notes

- **1 call per match** — `/fixtures?id=` returns events, statistics, lineups, and players in a single response (no need for separate `/fixtures/events` or `/fixtures/statistics` calls)
- **Parallel fetching** — fixture detail calls for multiple matches can run in parallel with `Promise.all`
- **Fixture ID** — use `fixture.id` from the list response throughout
- **Referee** — available in fixture detail (`fixture.referee`)
