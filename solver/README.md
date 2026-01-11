# Lineup Team Solver

Production-grade team balancing API using Google OR-Tools CP-SAT solver.

## Features

- **Mathematically Optimal**: Uses constraint programming to guarantee the best possible team balance
- **Multi-objective**: Balances skill ratings, age distribution, and position coverage
- **Fair Sub Allocation**: Substitutes are assigned to bench teams for fair rotation
- **Deterministic**: Same input always produces same output

## Deployment

### Option 1: Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repository
4. Set root directory to `solver/`
5. Railway will auto-detect Python and deploy

### Option 2: Render

1. Create account at [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect GitHub and select this repository
4. Set root directory to `solver/`
5. Render will use `render.yaml` for configuration

### Option 3: Docker

```bash
docker build -t lineup-solver .
docker run -p 5001:5001 lineup-solver
```

## Environment Variables

Set in your Next.js app:

```
SOLVER_API_URL=https://your-solver-url.railway.app
```

## API Endpoints

### POST /api/solve

Generate balanced teams.

```json
{
  "players": [
    {
      "player_id": "uuid-1",
      "name": "John Doe",
      "age": 25,
      "rating": 4,
      "main_position": "MID",
      "alt_position": "DF"
    }
  ],
  "options": {
    "timeout_seconds": 10.0
  }
}
```

### GET /api/health

Health check endpoint.

## Algorithm Details

The solver uses Google OR-Tools CP-SAT to:

1. **Minimize skill gap** between teams (weight: 1000)
2. **Minimize age gap** between teams (weight: 200)
3. **Ensure GK coverage** per team (hard constraint if possible)
4. **Respect position preferences** (penalties for mismatches)
5. **Balance substitutes** across team benches

Team rules:
- Minimum 6 players to play
- Teams of 3-7 players
- Prefer 7-a-side when 14+ players
- Yellow team only when 21+ players
