# 🗳️ Voice and Visual Voting System
### Team Wintheft | ByteQuest 2025

A secure, multi-modal voting application designed to make elections accessible and fraud-resistant. This system allows users to cast votes using either a **Visual Interface** (clicking symbols) or **Voice Commands**, featuring a secure server architecture.

---

## 🌟 Key Features
* **Visual Voting:** User-friendly HTML interface featuring standard election symbols (Lotus, Hand, Elephant, etc.).
* **Voice Voting:** Integrated speech recognition (`audiovote.py`) allowing users to cast votes verbally.
* **Secure Connection:** Uses SSL/TLS (`.pem` keys) to ensure secure communication between the client and the server.
* **Accessibility:** Designed to help visually impaired or illiterate voters participate easily.

---

## 📂 Project Structure
* `main.py` - The main server script to run the application.
* `votting.html` - The frontend web interface for voters.
* `audiovote.py` - Module handling voice recognition and processing.
* `server_files/` - Contains SSL security certificates (Public/Private keys).
* **Assets:** `.webp` images for election symbols.

---

## 🚀 How to Run

### 1. Prerequisites
Make sure you have Python installed. You may need to install the required libraries:
```bash
pip install -r requirements.txt
# OR manually install common dependencies if no requirements file exists:
pip install flask SpeechRecognition pyaudio
---

### **Step 2: Save and Push to GitHub**
Once you have pasted the text above and saved the file (`Ctrl + S`), run these commands in your terminal to update your GitHub repositories:

```powershell
git add README.md
git commit -m "Added project documentation"
git push -u origin main
git push -u team main
