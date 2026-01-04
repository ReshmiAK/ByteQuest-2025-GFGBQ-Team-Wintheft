
SecureVote EVS – Accessible Voting Demo
=======================================

SecureVote EVS is a small end‑to‑end demo of an electronic voting system built with React and TypeScript. It focuses on usability and accessibility for different types of voters while still simulating a secure, auditable backend.

The project runs completely in the browser and stores data locally on the machine. It is intended for demos, coursework and UX experiments, not for real elections.

Main Features
-------------

- **Home screen** with two clear entry points:
	- **Launch Polling Booth** – voter interface (kiosk style).
	- **Admin Console** – election configuration and results.
- **Admin Console**
	- Create and remove candidates with a name, party and symbol (emoji).
	- Start and stop the election.
	- Reset the whole system for a fresh run.
	- Live tally of votes and simple charts.
- **Polling Booth (voter side)**
	- Simple “System Online / Official Polling Booth” screen.
	- Two assisted modes:
		- **Voice Voting** – speak a number and confirm by saying “YES”.
		- **Visual Voting** – eye‑tracking demo using the webcam and blink confirmation.
	- After each vote, the app returns to the home screen so the next voter can start from the beginning.
- **Mock secure backend**
	- Uses browser crypto APIs to simulate encrypting votes.
	- Stores only encrypted payloads plus a receipt hash per vote.
	- Keeps an aggregated tally per candidate for the admin view.

Technology Stack
----------------

- **Frontend**: React + TypeScript (Vite bundler).
- **Styling**: Tailwind‑style utility classes (via CDN) and custom components.
- **State & data**:
	- Local in‑memory service (`mockBackend`) that behaves like a tiny server.
	- Data is persisted in `localStorage` so refreshes keep the current election state.
- **Crypto**: Browser Web Crypto API for key generation, encryption and hashing.
- **Voice**: Web Speech API
	- `SpeechRecognition` / `webkitSpeechRecognition` for speech‑to‑text.
	- `speechSynthesis` for spoken instructions and confirmations.
- **Visual tracking**: MediaPipe FaceMesh running in the browser via `@mediapipe/face_mesh`.

Project Structure
-----------------

The important folders and files are:

- `App.tsx` – top‑level router for Splash, Booth and Admin views.
- `views/`
	- `PollingBooth.tsx` – original kiosk‑style voting flow using the mock socket.
	- `AudioVote.tsx` – voice voting screen and logic.
	- `VisualVote.tsx` – eye‑tracking voting screen.
	- `AdminDashboard.tsx` – admin console and results.
- `services/`
	- `mockBackend.ts` – in‑browser “server”, candidates, votes and tallies.
	- `cryptoService.ts` – wrapper around Web Crypto.
	- `ttsService.ts` – helper for text‑to‑speech in other views.
- `components/Shared.tsx` – shared `Button`, `Card` and icon components.
- `types.ts` – shared TypeScript types for candidates, votes and socket messages.

Getting Started
---------------

Requirements:

- Node.js and npm installed.
- A modern desktop browser (Google Chrome is recommended for voice recognition).

Steps to run the project locally:

1. Install dependencies:

	 ```bash
	 npm install
	 ```

2. Start the Vite development server:

	 ```bash
	 npm run dev
	 ```

3. Open the URL shown in the terminal (for example `http://localhost:3000` or another port) in your browser.

Using the Application
---------------------

### 1. Configure the election (Admin Console)

1. From the home screen, click **Admin Console**.
2. Add candidates by entering:
	 - Candidate name
	 - Party name
	 - Symbol (usually an emoji, e.g. 🐘 or ✋)
3. Start the election. The polling booth views will now use these candidates.

You can return to the admin view at any time to inspect live results.

### 2. Voice Voting (voter side)

1. From the home screen, click **Launch Polling Booth**.
2. Choose **Start with Audio**.
3. Allow microphone access when the browser asks.
4. The system speaks out the options:
	 - “Say 1 to vote for …”
	 - “Say 2 to vote for …” and so on.
5. When the screen says “Listening for your number…”, clearly say **one**, **two**, **three** or **four** (depending on how many candidates were configured).
6. If a number is recognized, a popup appears showing the selected candidate and asking you to **say YES to lock your vote**.
7. Say **“yes”** (or similar). The system:
	 - Confirms your vote by voice.
	 - Records the vote in the backend.
	 - Shows a receipt hash.
	 - Returns to the home screen for the next voter.

### 3. Visual / Eye‑Tracking Voting

1. From the home screen, click **Launch Polling Booth**.
2. Choose **Start (Visual Only)**.
3. Allow camera access when prompted.
4. Keep your face in view of the camera. A small dot will move around the four candidate cards according to the estimated eye position.
5. Look steadily at the card you want to vote for.
6. Close your eyes for a short moment while looking at that card. A confirmation popup appears with the chosen candidate.
7. Use the on‑screen buttons to either change selection or confirm. On confirmation, the vote is recorded and the app returns to the home screen.

How Votes Are Stored
--------------------

- Each confirmed vote is converted into an encrypted payload using the browser crypto APIs.
- Only this encrypted blob plus a timestamp, booth ID and a receipt hash are stored.
- The tally for each candidate is updated separately, so the admin console only ever sees:
	- Total votes per candidate
	- Not the individual decrypted ballot.
- All state lives in the browser (`localStorage`), so refreshing the page does not erase the election unless the admin explicitly resets it.

Limitations
-----------

- Voice recognition relies on the browser’s Web Speech API and works best in Chrome on desktop.
- Eye tracking uses MediaPipe FaceMesh and assumes good lighting and a visible face.
- There is no backend server or database; everything is local to the browser where the demo is running.
- This codebase is for demonstration and educational purposes only and is **not** intended for production election systems.
  
 Contributors Note
-----------------
Some initial project scaffolding was generated using automated tools.
Core logic, features, and implementation were designed and developed by the team.


License
-------

This project is provided as a sample for learning and demonstration. Adapt it as needed for your own experiments or coursework.

