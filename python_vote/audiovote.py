import cv2
import pyttsx3
import numpy as np
import time
import speech_recognition as sr

# --- 1. AUTO-DETECT MICROPHONE ---
def get_best_microphone():
    mics = sr.Microphone.list_microphone_names()
    print("\n--- AUTO-DETECTING MICROPHONE ---")
    for i, name in enumerate(mics):
        if "Boult" in name and "Headset" in name:
            print(f"✅ Found Boult Headset at Index {i}")
            return i
    # Fallback to default
    return 0

MIC_INDEX = get_best_microphone()

# --- 2. AUDIO OUTPUT ---
def speak(text):
    try:
        engine = pyttsx3.init(driverName='sapi5')
        engine.setProperty('rate', 135)
        print(f"System: {text}")
        engine.say(text)
        engine.runAndWait()
        del engine
    except:
        pass

# --- 3. ROBUST LISTENING ---
recognizer = sr.Recognizer()
recognizer.energy_threshold = 250  
recognizer.dynamic_energy_threshold = True

# We prepare the mic ONCE at the start to avoid delays later
mic_source = sr.Microphone(device_index=MIC_INDEX)

def prepare_mic():
    """Calibrates mic once at startup."""
    with mic_source as source:
        print("Calibrating Microphone... (Please remain silent for 1 second)")
        recognizer.adjust_for_ambient_noise(source, duration=1.0)
        print("Calibration Complete.")

def listen():
    try:
        with mic_source as source:
            print("\n>>> LISTENING... <<<")
            # Listen longer (timeout=5) but process fast (phrase_time_limit=3)
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=3)
            
            command = recognizer.recognize_google(audio).lower()
            print(f"User said: '{command}'") # Shows exactly what it heard
            return command
            
    except sr.WaitTimeoutError:
        return None
    except sr.UnknownValueError:
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# --- 4. DATA (Expanded for better detection) ---
candidates = {
    # Variations for 1
    '1': "Lotus", 'one': "Lotus", 'won': "Lotus", 'on': "Lotus", '11': "Lotus", '111': "Lotus",
    # Variations for 2
    '2': "Hand", 'two': "Hand", 'to': "Hand", 'too': "Hand", 'tu': "Hand", '22': "Hand",
    # Variations for 3
    '3': "Hammer", 'three': "Hammer", 'tree': "Hammer", 'free': "Hammer", '33': "Hammer",
    # Variations for 4
    '4': "Elephant", 'four': "Elephant", 'for': "Elephant", 'fo': "Elephant", '44': "Elephant"
}

# Variations for "YES"
confirmation_words = ["yes", "yeah", "yep", "yas", "ya", "correct", "right", "sure", "ok"]


def show_ui(status):
    screen = np.zeros((600, 800, 3), dtype='uint8')
    cv2.putText(screen, "VOICE VOTING", (250, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
    cv2.putText(screen, status, (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
    return screen

# --- 5. MAIN LOOP ---
def run_voice_voting():
    prepare_mic() # Run this ONCE at the start
    
    screen = show_ui("Initializing...")
    cv2.imshow("Voice Vote", screen)
    cv2.waitKey(500)
    
    speak("System Ready.")
    
    # Announce Options
    options = [("1", "Lotus"), ("2", "Hand"), ("3", "Hammer"), ("4", "Elephant")]
    for num, name in options:
        speak(f"Say {num} to vote for {name}")
        time.sleep(0.2)

    vote_cast = False
    
    while not vote_cast:
        cv2.imshow("Voice Vote", show_ui("Listening..."))
        if cv2.waitKey(100) & 0xFF == ord('q'): break
        
        speak("Please say your number.")
        command = listen()

        if not command:
            speak("I didn't hear anything. Speak louder.")
            continue
            
        # Check Candidate
        found = None
        for key in candidates:
            if key in command: # "111" contains "1", so this matches
                found = candidates[key]
                break
        
        if found:
            speak(f"You picked {found}. Say YES to confirm.")
            
            # Short pause to ensure you are ready
            time.sleep(0.2)
            confirm = listen()
            
            # Check for any variation of YES
            is_confirmed = False
            if confirm:
                for word in confirmation_words:
                    if word in confirm:
                        is_confirmed = True
                        break

            if is_confirmed:
                speak(f"Vote confirmed for {found}. Thank you.")
                print(f"\n>>> VOTE SUCCESS: {found} <<<\n")
                cv2.imshow("Voice Vote", show_ui(f"VOTED: {found}"))
                cv2.waitKey(3000)
                vote_cast = True
            else:
                speak("Cancelled. Let's try again.")
        else:
            speak("Invalid. Say One, Two, Three, or Four.")

    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_voice_voting()
