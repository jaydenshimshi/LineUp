# Soccer Team Check‑in & Balanced Matchmaking Web App

**Version:** v1.0 (Initial Specification)

---

## 1. Vision & Purpose

The goal of this application is to create a **fair, organized, and modern sports coordination platform**, starting with **soccer**, that allows:

- Players to register once and seamlessly check in for real, calendar‑based match days
- Admins to privately rate player skill and manage game‑day logistics
- The system to generate **highly balanced teams** using deterministic, constraint‑based optimization (not guesswork)
- Clear communication through announcements and (future) chat functionality

This document defines **all requirements, architecture decisions, algorithms, and future‑proofing considerations** for the soccer version (v1), designed to scale to additional sports later.

---

## 2. Core Design Principles

1. **Fairness first** – Team generation must minimize imbalance in skill, age, and position coverage.
2. **Deterministic logic** – Team assignment is handled by an optimization algorithm, not an LLM.
3. **Privacy by design** – Player ratings are admin‑only and never visible to players.
4. **Real‑time awareness** – Players immediately know if games are happening *today*.
5. **Extensibility** – Architecture supports future sports, chat, and analytics without rework.

---

## 3. Technology Stack

### Frontend
- **Framework:** Next.js (React, App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui

### Backend & Infrastructure
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (email / phone)
- **Realtime updates:** Supabase Realtime (check‑ins, announcements)
- **Deployment:** Vercel

### Optimization Engine
- **Team matching:** Google OR‑Tools (CP‑SAT solver)
- Implemented as a dedicated service (Node.js or Python)

### Lightweight Local LLM (Non‑decision‑making)
- **Runtime:** Ollama (local)
- **Model:** Llama 3.2 (1B or 3B)
- **Usage:** Text generation only (explanations, summaries, announcements)

---

## 4. User Roles

### 4.1 Player
- Create and manage profile
- Check in/out for specific calendar dates
- View announcements
- View assigned team for a date
- (Future) participate in chat

### 4.2 Admin
- Manage players
- Secretly assign skill ratings (1–5 stars)
- Create announcements
- Generate, edit, publish, and lock teams
- Override assignments with audit trail

---

## 5. Functional Requirements

### 5.1 Player Profile (Required First Step)

**Fields**
- Full name (required)
- Age (required)
- Main position (required): GK / DF / MID / ST
- Alternate position (optional)
- Email (optional, opt‑in)
- Phone number (optional, opt‑in)

**Rules**
- Player cannot check in until profile is complete
- Profile edits are versioned (for audit/history if needed)

---

### 5.2 Real‑Time Date‑Based Check‑in

- Check‑ins are tied to real dates (YYYY‑MM‑DD)
- Calendar defaults to **current week**, with **Today clearly highlighted**
- Player toggles availability per day (Yes / No)

**Rules**
- One check‑in record per player per date
- Check‑in counts update in real time
- Minimum players required to play: **6**

---

### 5.3 Announcements System

Admins can broadcast messages to players.

**Announcement Types**
- **Global:** visible across all dates
- **Date‑specific:** tied to a specific match day

**Fields**
- Title
- Message body
- Urgency: INFO / IMPORTANT
- Visible from / visible until

**Usage Examples**
- “Game ON today at 6pm”
- “No game today – weather”

Announcements appear:
- On login
- On Today’s page
- Above check‑in calendar

---

### 5.4 Team Formation Rules (Soccer v1)

**Team Sizes**
- Minimum team size: **3**
- Maximum team size: **7**
- The solver should prefer **7-a-side** when enough players are available.

**Team Counts & Yellow Team Rule (Important)**
- By default the app forms **Team Red** and **Team Blue**.
- A **third team (Yellow)** is created **only when three full teams of 7 can be formed**.
  - i.e., **Yellow exists only if total checked-in players ≥ 21** (7+7+7)
- If checked-in players are not enough for Yellow, any remaining players after filling Red and Blue become **Subs**.

**7-a-side Fill Rule**
- If checked-in players ≥ 14, the solver fills:
  - Red = 7 and Blue = 7
  - Remaining players (1–6) become **Subs**
- If checked-in players ≥ 21, the solver fills:
  - Red = 7, Blue = 7, Yellow = 7
  - Remaining players (1–6) become **Subs**
- If checked-in players are between 6 and 13, the solver forms the **best-balanced two teams** within size bounds (3–7), typically splitting as evenly as possible.

**Sub Allocation Fairness (Must-Have)**
- Subs are not a random leftover group.
- Each sub is assigned a **Bench Team** (Red/Blue, and Yellow only if Yellow exists).
- Bench allocation is also optimized using the same fairness logic (skill, age, positions) so that rotations/substitutions remain fair.

**Match Eligibility**
- < 6 players → No match
- ≥ 6 players → Team generation allowed

---

## 6. Team Matching Algorithm (High‑Robustness)

### 6.1 Philosophy

- Team assignment is **never handled by an LLM**
- Uses **constraint optimization (CP‑SAT)** to guarantee fairness within defined rules
- Results are deterministic, auditable, and reproducible

---

### 6.2 Inputs

For a selected date:
- Checked‑in players
- For each player:
  - Skill rating (1–5 stars, admin‑only)
  - Age
  - Main position
  - Alternate position (optional)

---

### 6.3 Decision Variables

- `x[p,t]` → player p assigned to team t (binary)
- `s[p]` → player p assigned as sub (binary)
- Optional role variables per team (GK/DF/MID/ST/FLEX)

---

### 6.4 Hard Constraints (Must Always Hold)

1. **Unique assignment**
   - Each player must be assigned to exactly one team or to subs

2. **Team size bounds**
   - 3 ≤ team size ≤ 7

3. **Goalkeeper coverage**
   - If ≥ 2 GK‑capable players exist, each team must have one
   - Otherwise, non‑GK assignment allowed with penalty

4. **Position distribution**
   - Teams must approximate balanced formations based on team size
   - Position mismatches allowed only when unavoidable

5. **Match feasibility**
   - Algorithm exits early if < 6 players

---

### 6.5 Optimization Objectives (Minimized in Order)

1. **Skill balance**
   - Minimize difference between strongest and weakest team

2. **Age balance**
   - Minimize age sum variance between teams

3. **Position mismatch penalties**
   - Penalize assignments outside main/alternate position

4. **Sub fairness (optional v1.1)**
   - Avoid repeatedly benching same players across weeks

---

### 6.6 Output

For each team:
- Team color (Red / Blue / Yellow)
- Player list
- Assigned roles
- Reasoning notes (stored internally)

Admins may:
- Regenerate
- Manually override
- Publish and lock teams

---

## 7. Lightweight LLM Integration (Safe Usage)

### Purpose (Only These)
- Generate **human‑readable explanations** for assignments
- Rephrase announcements
- Summarize daily participation (e.g., “12 players checked in today”)

### Strict Limitations
- LLM **never** assigns teams
- LLM **never** accesses raw ratings
- Output is display‑only text

---

## 8. Data Model (Supabase / PostgreSQL)

### Core Tables

**users**
- id, auth fields, role

**players**
- id, user_id
- full_name, age
- main_position, alt_position
- contact_email, contact_phone
- contact_opt_in

**player_admin_ratings**
- player_id (unique)
- rating_stars (1–5)
- rated_by_admin_id

**checkins**
- player_id
- date
- status

**announcements**
- id, title, body
- scope_type (GLOBAL / DATE)
- scope_date
- urgency
- visible_from, visible_until

**team_runs**
- id, date
- algorithm_version
- status (DRAFT / PUBLISHED / LOCKED)

**team_assignments**
- team_run_id
- player_id
- team_color
- assigned_role
- assignment_reason

---

## 9. Security & Privacy

- Supabase Row‑Level Security enforced
- Players cannot read ratings table under any circumstance
- Admin‑only write access to ratings, teams, announcements
- Team data exposed only after publish

---

## 10. UX Flow Summary

1. Login
2. Today view (announcement + playing status)
3. Profile completion (if needed)
4. Weekly check‑in
5. Admin generates teams
6. Admin publishes teams
7. Players view teams


flowchart TD
  A[Login] --> B[Home: TODAY status + Announcement banner]
  B --> C{Profile complete?}
  C -- No --> D[Complete Profile]
  C -- Yes --> E[Weekly Calendar: Check-in toggles]
  B --> F[View Today's Team (if published)]
  Admin[Admin Dashboard] --> G[Players + Ratings]
  Admin --> H[Announcements (Global/Date)]
  Admin --> I[Select date -> checked-in list]
  I --> J{>= 6?}
  J -- No --> K[Not enough players notice]
  J -- Yes --> L[Run OR-Tools Optimizer]
  L --> M[Draft Teams + Admin Edits]
  M --> N[Publish + Lock]
  N --> O[Players see teams + text explanation]
---

## 11. Build Phases

### Phase 1 – Foundation
- Auth, profiles, admin roles
- Announcements

### Phase 2 – Check‑ins
- Real‑time calendar
- Today view

### Phase 3 – Team Optimizer
- OR‑Tools integration
- Admin controls
- Team publish/lock

### Phase 4 – LLM Enhancements
- Explanations
- Summaries

### Phase 5 – Future Expansion
- Chat rooms
- Multi‑sport support
- Performance analytics

---

## 12. Future‑Ready Features (Not v1)

- Discord‑style chat rooms (global / date / team)
- Player reliability scores
- ELO‑based dynamic ratings
- Multiple sports (basketball, volleyball, etc.)
- Mobile app wrapper

---

**End of Specification**

