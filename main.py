import sys
import time
import math
import cv2
import pyautogui
import os
import numpy as np
import webbrowser

# --- AUTO-OPEN WEBSITE ---
try:
    # This opens the new voting page automatically
    webbrowser.open("file://" + os.path.realpath("votting.html"))
except Exception as e:
    print(f"Error opening website: {e}")

# --- PATCHES ---
if not hasattr(np, 'float'): np.float = float
if not hasattr(np, 'int'): np.int = int

# --- SETUP ---
try:
    import mediapipe as mp
    mp_face_mesh = mp.solutions.face_mesh
except ImportError:
    print("MediaPipe not found. Run: pip install mediapipe")
    sys.exit()

# ---------------- CONFIGURATION ----------------
pyautogui.FAILSAFE = False
SCREEN_W, SCREEN_H = pyautogui.size()
SMOOTHING = 0.2
BLINK_THRESHOLD = 0.006
FRAMES_TO_SELECT = 15  
blink_counter = 0      
icon_size = 120

# ---------------- SMART IMAGE LOADER ----------------
def load_icon_safe(filename):
    if not os.path.exists(filename):
        return None
    img = cv2.imread(filename, cv2.IMREAD_COLOR)
    if img is None: return None
    return cv2.resize(img, (icon_size, icon_size))

icon_lotus = load_icon_safe("lotus.webp")
icon_hand = load_icon_safe("hand.webp")
icon_ele = load_icon_safe("ele.webp")
icon_hammer = load_icon_safe("hammer.webp") 

# ---------------- INIT FACEMESH ----------------
face_mesh = mp_face_mesh.FaceMesh(
    refine_landmarks=True,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

cam = cv2.VideoCapture(0)
_sx, _sy = SCREEN_W // 2, SCREEN_H // 2
mid_x, mid_y = SCREEN_W // 2, SCREEN_H // 2

def get_current_zone(x, y):
    if x < mid_x and y < mid_y: return "LOTUS"
    if x >= mid_x and y < mid_y: return "HAND"
    if x < mid_x and y >= mid_y: return "ELEPHANT"
    if x >= mid_x and y >= mid_y: return "HAMMER"
    return None

def draw_corner(img, corner_img, name, x, y, color):
    if corner_img is not None:
        img[y:y+icon_size, x:x+icon_size] = corner_img
    else:
        cv2.rectangle(img, (x, y), (x+icon_size, y+icon_size), color, -1)
        cv2.putText(img, name, (x+10, y+70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

print("\n" + "="*50)
print(" SYMBOL SELECTOR ACTIVE")
print(" 1. Look at a corner.")
print(" 2. Close eyes and HOLD to select.")
print("="*50 + "\n")

while True:
    ret, frame = cam.read()
    if not ret: break
    
    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    output = face_mesh.process(rgb_frame)
    h, w, _ = frame.shape

    # --- DRAW INTERFACE ---
    cv2.line(frame, (w//2, 0), (w//2, h), (255, 255, 255), 2)
    cv2.line(frame, (0, h//2), (w, h//2), (255, 255, 255), 2)

    draw_corner(frame, icon_lotus, "LOTUS", 10, 10, (0, 165, 255)) 
    draw_corner(frame, icon_hand, "HAND", w-10-icon_size, 10, (255, 0, 0))
    draw_corner(frame, icon_ele, "ELEPHANT", 10, h-10-icon_size, (255, 0, 0))
    draw_corner(frame, icon_hammer, "HAMMER", w-10-icon_size, h-10-icon_size, (0, 0, 255))

    if output.multi_face_landmarks:
        landmarks = output.multi_face_landmarks[0].landmark

        ir_x = sum([landmarks[i].x for i in range(474, 478)]) / 4
        ir_y = sum([landmarks[i].y for i in range(474, 478)]) / 4
        
        target_x = (ir_x - 0.5) * 2.0 * SCREEN_W + (SCREEN_W / 2)
        target_y = (ir_y - 0.5) * 2.0 * SCREEN_H + (SCREEN_H / 2)
        
        _sx = _sx * (1 - SMOOTHING) + target_x * SMOOTHING
        _sy = _sy * (1 - SMOOTHING) + target_y * SMOOTHING
        
        curr_x = max(0, min(SCREEN_W, int(_sx)))
        curr_y = max(0, min(SCREEN_H, int(_sy)))
        pyautogui.moveTo(curr_x, curr_y)

        left_dist = math.hypot(landmarks[159].x - landmarks[145].x, landmarks[159].y - landmarks[145].y)
        symbol_name = get_current_zone(curr_x, curr_y)

        if left_dist < BLINK_THRESHOLD:
            blink_counter += 1
            cv2.putText(frame, f"VOTING {symbol_name}...", (w//2 - 150, h//2), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            
            if blink_counter % 5 == 0:
                print(f"Selecting {symbol_name}...", end="\r")

            # --- VOTE TRIGGERED ---
            if blink_counter > FRAMES_TO_SELECT:
                print(f"\n >>> VOTE CONFIRMED: {symbol_name} <<<\n")
                
                # 1. CLICK THE WEBSITE BUTTON
                # This triggers the "Success" screen on the website
                pyautogui.click() 
                
                # 2. SHORT PAUSE 
                # Allows the click to register and audio to start
                time.sleep(1.0) 

                # 3. CLOSE PYTHON ONLY
                # We break the loop, which reaches cam.release() below.
                # The Website stays OPEN showing "Successfully Voted".
                print("Closing Camera...")
                break 
        else:
            blink_counter = 0

    cv2.imshow('Symbol Selector', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cam.release()
cv2.destroyAllWindows()
print("System Exited cleanly.")