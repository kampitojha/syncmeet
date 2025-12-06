# ⚡ SyncMeet

**Premium, Serverless, Peer-to-Peer Video Collaboration.**

SyncMeet is a minimal yet powerful 1:1 video calling platform designed for high-quality collaboration. It operates entirely client-side using WebRTC and BitTorrent-based signaling, ensuring privacy and zero latency.

> **Technical Deep Dive**: For a detailed architectural explanation (in Hinglish), please read [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md).

---

## ✨ Key Features

### 📹 Crystal Clear Communication
*   **HD Video & Audio**: Direct P2P stream via WebRTC.
*   **Screen Sharing**: Share your entire screen or specific windows with a single click.
*   **Smart Bandwidth**: Adaptive bitrate ensures connection stability even on slow networks.

### 🤝 Collaboration Tools
*   **Interactive Whiteboard**: Real-time drawing canvas for brainstorming ideas.
*   **Collaborative Notes**: Shared text editor for meeting minutes, agendas, or code snippets.
*   **Rich Chat**: Integrated chat with file support and link previews.

### 🎨 User Experience
*   **Reactive UI**: Beautiful, glassmorphic interface with audio-reactive borders.
*   **Live Reactions**: Floating emojis to give feedback without speaking.
*   **Mobile First**: Fully responsive design with optimized touch controls and layouts.
*   **Zero Login**: No sign-ups. No data collection. Just create a room and join.

---

## 🛠 Tech Stack

*   **Frontend**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Glassmorphism effects
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Core Logic**: Native WebRTC API
*   **Signaling**: [Trystero](https://github.com/dmotz/trystero) (Serverless/BitTorrent)

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+ recommended)
*   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/syncmeet.git
    cd syncmeet
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Open in Browser**
    Visit `http://localhost:5173`.
    *To test the connection, open the link in a second tab or a different device on the same WiFi.*

---

## 📖 How to Use

1.  **Join**: Enter your name and any Room ID (e.g., `daily-sync`).
2.  **Invite**: Share the Room ID with your peer.
3.  **Collaborate**: Use the floating dock to toggle Cam, Mic, Screen Share, Whiteboard, or Notes.

---

## 🤝 Contributing

Contributions are welcome!
1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/NewFeature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License.