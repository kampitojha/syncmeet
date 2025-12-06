# 🚀 SyncMeet 1:1 - Project Overview

Ye document pure project ka naksha (map) hai. Isse padh kar samajh aa jayega ki ye application kaise kaam kar rhi hai, files ek dusre se kaise judi hain, aur data kaise flow ho raha hai.

---

## 🛠 Tech Stack (Kya use kiya hai?)

1.  **React + TypeScript**: UI aur logic ke liye.
2.  **Vite**: Project ko run aur build karne ke liye (fast tool).
3.  **Tailwind CSS**: Styling aur design ke liye (Mobile responsive banane ke liye).
4.  **WebRTC (Native)**: Video aur Audio call ka main engine. Ye browser ka inbuilt feature hai.
5.  **Trystero**: Ye ek "Serverless" signaling library hai.
    *   *Kyu?* Normal video call apps ko ek backend server chahiye hota hai users ko milane ke liye. Trystero **BitTorrent** technology use karta hai taaki users bina server ke direct connect ho sake.
6.  **Lucide React**: Icons ke liye (Mic, Camera, Chat icons).

---

## 📂 File Structure & Responsibilities (Kaunsi file kya karti hai?)

Niche har important file ka explanation hai:

### 1. Entry Points (Darwaza)
*   **`index.html`**: Ye main HTML file hai. Isme `root` div hai jaha React app mount hoti hai. Tailwind ki script bhi yahin hai.
*   **`index.tsx`**: React ka starting point. Ye `App.tsx` ko browser me load karta hai.

### 2. Main Logic Container
*   **`App.tsx` (The Boss)**:
    *   Ye puri app ka "Brain" hai.
    *   Ye decide karta hai ki user **Login Screen** pe rahega ya **Video Room** mein.
    *   Ye saare "Hooks" ko call karta hai (`useWebRTC`, `useChat`).
    *   Mobile layout (`h-[100dvh]`) aur responsive grid yahi handle karta hai.

### 3. Custom Hooks (Asli Kaam Karne Wale)
Ye `hooks/` folder me hain. Ye logic ko UI se alag rakhte hain.

*   **`hooks/useWebRTC.ts` (The Engine)**:
    *   Sabse complex file yahi hai.
    *   **Kaam:** Camera/Mic access lena, Peer connection banana (`RTCPeerConnection`).
    *   **Important Logic:** Isme humne "Transceivers" aur "ICE Candidate buffering" ka code likha hai taaki agar connection slow ho to bhi video black screen na dikhaye.
    *   Ye decide karta hai video bhejni hai ya nahi.
    
*   **`hooks/useChat.ts`**:
    *   Chat messages ko sambhalta hai.
    *   Typing indicator logic ("Peer is typing...") yahi calculate karta hai.

*   **`hooks/useAudioLevel.ts`**:
    *   Ye check karta hai ki user bol raha hai ya chup hai.
    *   Isi ki wajah se jab koi bolta hai to video ke aas-paas "Green Border/Glow" aata hai.

### 4. Services (The Postman)
*   **`services/signaling.ts`**:
    *   Ye `Trystero` library ka wrapper hai.
    *   **Kaam:** Jab do log alag-alag networks pe hote hain, unhe ek dusre ka IP address nahi pata hota. Ye file ek user ka data (Offer/Answer) dusre user tak pahunchati hai internet ke through.
    *   Isme `join`, `offer`, `answer`, `ice-candidate`, `chat` events handle hote hain.

### 5. Components (Jo Screen Pe Dikhta Hai)
*   **`components/VideoTile.tsx`**:
    *   Ye ek single video box hai.
    *   Agar video off hai to Avatar dikhata hai.
    *   Agar user bol raha hai to border glow karta hai (`useAudioLevel` ka use karke).
*   **`components/Controls.tsx`**:
    *   Bottom bar wale buttons (Mute, Camera, Screen Share, Leave).
    *   Ye sirf UI hai, click hone par function `App.tsx` se aate hain.
*   **`components/Chat.tsx`**:
    *   Side me khulne wala chat box.
    *   **Mobile Fix:** Isme humne extra padding (`pb-40`) di hai taaki mobile keyboard open hone par input box chip na jaye.

---

## 🔄 Data Flow (App kaise chalti hai?)

Imagine karo **User A** (Laptop) aur **User B** (Mobile) connect ho rahe hain:

1.  **Room Join Karna**:
    *   Dono same `Room ID` dalte hain.
    *   `App.tsx` -> `useWebRTC` -> `signaling.ts` -> **Trystero Network**.
    *   Dono ek dusre ko signal bhejte hain "Main aa gaya hu".

2.  **Handshake (Connection Banana)**:
    *   **User A** ek `Offer` create karta hai (Mera video format ye hai, audio ye hai).
    *   `signaling.ts` ye offer **User B** ko bhejta hai.
    *   **User B** offer accept karta hai aur `Answer` bhejta hai.
    *   Ab `hooks/useWebRTC.ts` active hota hai connection establish karne ke liye.

3.  **ICE Candidates (Raasta Dhundna)**:
    *   WebRTC internet pe best raasta dhundta hai (Direct IP ya Google STUN server ke through).
    *   Ye data exchange hota hai taaki video packets flow ho sakein.
    *   *Fix:* Humne yaha "Buffering" lagayi hai taaki agar raasta pehle mil jaye aur connection baad me bane, to bhi call fail na ho.

4.  **Media Streaming**:
    *   Ek baar connection ban gaya, to Video aur Audio direct `Peer-to-Peer` flow hota hai (Server beech me nahi hota).
    *   Chat messages `signaling.ts` ke through jaate hain.

---

## 📱 Mobile vs Desktop Flow

*   **Desktop**: Chat side me khulta hai (Sidebar).
*   **Mobile**: Chat slide-over menu hai. Input box ko upar uthaya gaya hai taaki floating controls (Mic/Camera buttons) uske upar na aayein.

---

## 🔑 Key Files Relationship Graph

```text
index.tsx
   └── App.tsx
        ├── signaling.ts (Connects to Internet)
        ├── hooks/useWebRTC.ts (Video Logic)
        │      └── calls signaling.ts
        ├── hooks/useChat.ts (Msg Logic)
        │      └── calls signaling.ts
        │
        ├── components/VideoTile.tsx
        │      └── hooks/useAudioLevel.ts
        ├── components/Controls.tsx
        └── components/Chat.tsx
```

Bas yahi hai pure project ka structure! Backend ka koi jhanjhat nahi, sab kuch frontend (browser) pe hi handle ho raha hai smart tarike se. 🚀
