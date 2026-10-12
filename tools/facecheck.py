"""
Measure how much headroom each backdrop photo actually has.

The page crops a 16:9 photo to a wider window and aligns it to the top, so what
matters is the space between the subject's head and the top edge of the photo.
This walks every photos/<n>.jpg, finds the largest face, estimates the crown
(hair sits above the detected face box) and reports the ratio — plus whether the
face is cut off entirely.

Usage: C:\\miniconda\\python.exe tools/facecheck.py [minRatio]
"""
import json
import os
import sys

import cv2
import numpy as np


def imread_unicode(path):
    """cv2.imread cannot open non-ASCII paths (this workspace is Chinese)."""
    data = np.fromfile(path, dtype=np.uint8)
    if data.size == 0:
        return None
    return cv2.imdecode(data, cv2.IMREAD_COLOR)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "photos")
TARGET = float(sys.argv[1]) if len(sys.argv) > 1 else 0.14

cascade = cv2.CascadeClassifier(
    os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
)
if cascade.empty():
    raise SystemExit("face cascade failed to load")

profile = cv2.CascadeClassifier(
    os.path.join(cv2.data.haarcascades, "haarcascade_profileface.xml")
)

numbers = sorted(
    int(name[:-4]) for name in os.listdir(PHOTOS)
    if name.endswith(".jpg") and name[:-4].isdigit()
)

results = {}
print(f"{'#':>3}  {'faces':>5}  {'crown@':>7}  {'verdict'}")
print("-" * 52)

for number in numbers:
    path = os.path.join(PHOTOS, f"{number}.jpg")
    image = imread_unicode(path)
    if image is None:
        continue
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    boxes = list(cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(70, 70)))
    kind = "frontal"
    if len(boxes) == 0 and not profile.empty():
        boxes = list(profile.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(70, 70)))
        kind = "profile"

    if len(boxes) == 0:
        results[str(number)] = {"faces": 0, "headroom": None, "verdict": "no-face"}
        print(f"{number:>3}  {0:>5}  {'-':>7}  NO FACE DETECTED")
        continue

    x, y, w, h = max(boxes, key=lambda box: box[2] * box[3])
    # A haar box starts around the eyebrows; the crown is roughly 0.35h above it.
    crown_y = max(0, y - int(h * 0.35))
    headroom = crown_y / height
    if headroom >= TARGET:
        verdict = "ok"
    elif headroom >= 0.07:
        verdict = "tight"
    else:
        verdict = "cut"
    results[str(number)] = {
        "faces": len(boxes),
        "kind": kind,
        "box": [int(x), int(y), int(w), int(h)],
        "headroom": round(headroom, 4),
        "verdict": verdict,
    }
    print(f"{number:>3}  {len(boxes):>5}  {headroom * 100:6.1f}%  {verdict.upper()} ({kind})")

with open(os.path.join(ROOT, "docs", "facecheck.json"), "w", encoding="utf-8") as sink:
    json.dump({"target": TARGET, "photos": results}, sink, ensure_ascii=False, indent=2)

bad = [n for n, r in results.items() if r["verdict"] in ("cut", "tight", "no-face")]
print("\ntarget headroom: %.0f%%" % (TARGET * 100))
print("needs attention:", ", ".join(sorted(bad, key=int)) or "none")
