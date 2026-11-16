# TalkPilot AI - Implementation Plan

Building **TalkPilot AI**, a full-stack AI outbound calling platform with React (react-scripts), Express, MongoDB, Socket.IO, Tailwind CSS, Recharts, and Lucide React.

## 1. Architecture Overview

### Backend Architecture (`talkpilot-ai/server`)
- **Config & DB**: Mongoose connection to MongoDB with auto-fallback to `mongodb-memory-server` for zero-friction local testing.
- **Auth System**: JWT authentication, bcrypt password hashing, auth middleware with user isolation.
- **Models**: `User`, `AIAgent`, `Contact` (with opt-out and DNC protection), `Campaign` (with concurrency & retry limits), `Call` (statuses: queued, initiating, ringing, connected, in_progress, completed, failed, no_answer, busy, cancelled, opted_out), `Transcript`.
- **Services**:
  - `telephony/`: Provider abstraction interface (`TelephonyAdapter`) supporting `MockTelephonyProvider` (realistic multi-turn AI voice simulation, ringing, audio duration, transcripts, summaries, outcomes) and `TwilioTelephonyProvider` (real PSTN calls).
  - `ai/`: AI conversation engine generating dynamic context-aware responses based on system prompt, objective, and customer input.
  - `transcription/`: Live audio stream & transcript generator + post-call summary & intent analyzer.
  - `calling/`: Queue manager handling rate limiting, concurrency, opt-out validation, automatic retries with backoff, real-time Socket.IO emission.
- **Controllers & Routes**: Authentication, Agents, Contacts (CSV import/export, DNC toggle), Campaigns (start, pause, resume, stop), Calls (history, details, end call), Dashboard stats, Telephony Webhooks.

### Frontend Architecture (`talkpilot-ai/client`)
- **Tech Stack**: React 18, `react-scripts` (CRA - NO Vite), React Router v6, Tailwind CSS, Lucide React, Recharts, Socket.IO Client, Axios.
- **Context**: `AuthContext` (JWT session management), `SocketContext` (real-time events: `call:status`, `call:transcript`, `campaign:updated`, etc.).
- **Layouts & Navigation**: Responsive sidebar (Dashboard, AI Agents, Contacts, Campaigns, Calls, Analytics, Settings, Profile/Logout) with mobile hamburger drawer and dark modern SaaS theme.
- **Pages & Components**:
  1. **Auth Pages**: Login, Register.
  2. **Dashboard**: Stat cards, Charts (Calls Overview, Status, Campaign performance), Recent calls table.
  3. **AI Agents**: Agent management & creation.
  4. **Contacts**: CRUD + CSV import/export + DNC opt-out status.
  5. **Campaigns**: Queue setup & Start/Pause/Stop control.
  6. **Live Call Monitoring**: Real-time transcript stream via Socket.IO.
  7. **Call Details**: Transcript, AI Summary, Outcome badges.
  8. **Call History**: Filterable history log.
  9. **Analytics**: Visual performance analytics with Recharts.
  10. **Settings**: AI & compliance settings.
