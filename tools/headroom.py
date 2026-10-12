"""
Give every backdrop photo the headroom the page needs.

The page aligns the photo to the top of the viewport, so a photo whose subject
was framed against the top edge ends up with the crown touching the page top.
This detects the face; when the space above the crown is under target it lifts
the photo down by padding the top with a blurred band taken from the photo's own
top edge (so nothing is invented, and the seam reads as a soft fade).

Usage: C:\\miniconda\\python.exe tools/headroom.py [target 0.16]
"""
import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "photos")
TARGET = float(sys.argv[1]) if len(sys.argv) > 1 else 0.16
ONLY = {int(value) for value in sys.argv[2:] if value.isdigit()}
MAX_PAD_RATIO = 0.30

cascade = cv2.CascadeClassifier(
    os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
)
profile = cv2.CascadeClassifier(
    os.path.join(cv2.data.haarcascades, "haarcascade_profileface.xml")
)


def imread_unicode(path):
    data = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None


def imwrite_unicode(path, image):
    ok, buffer = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 78])
    if ok:
        buffer.tofile(path)
    return ok


def crown_y(image):
    """Top edge of the subject's head in a 1600x900 photo, or None."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    boxes = list(cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(100, 100)))
    if len(boxes) == 0 and not profile.empty():
        boxes = list(profile.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(100, 100)))
    if len(boxes) == 0:
        return None
    height, width = image.shape[:2]

    def score(box):
        x, y, w, h = box
        centre_bonus = 1.6 if width * 0.2 < x + w / 2 < width * 0.8 else 0.6
        return w * h * centre_bonus

    x, y, w, h = max(boxes, key=score)
    return max(0, int(y - h * 0.35))


def lift(image, pad):
    """Push the subject down by padding the top with a blurred copy of its edge."""
    height, width = image.shape[:2]
    strip = image[0:max(10, pad // 3), :]
    cap = cv2.resize(strip, (width, pad), interpolation=cv2.INTER_LINEAR)
    cap = cv2.GaussianBlur(cap, (0, 0), sigmaX=max(8, pad * 0.5), sigmaY=max(8, pad * 0.5))
    cap = np.clip(cap.astype(np.float32) * 0.82, 0, 255).astype(np.uint8)
    body = image[0:height - pad, :]
    lifted = np.vstack([cap, body])
    if lifted.shape[0] != height or lifted.shape[1] != width:
        lifted = cv2.resize(lifted, (width, height))
    return lifted


changed = []
skipped = []
no_face = []
ROUNDS = 1
MAX_PAD_PER_ROUND = 0.20

for name in sorted((n for n in os.listdir(PHOTOS) if n.endswith(".jpg") and n[:-4].isdigit()), key=lambda n: int(n[:-4])):
    number = int(name[:-4])
    if ONLY and number not in ONLY:
        continue
    path = os.path.join(PHOTOS, name)
    image = imread_unicode(path)
    if image is None:
        continue
    height = image.shape[0]
    start = None
    total_pad = 0
    total_limit = int(height * 0.20)

    for _ in range(ROUNDS):
        crown = crown_y(image)
        if crown is None:
            break
        headroom = crown / height
        if start is None:
            start = headroom
        if headroom >= TARGET:
            break
        pad = int(round((TARGET - headroom) * height))
        pad = min(pad, int(height * MAX_PAD_PER_ROUND), total_limit - total_pad)
        if pad < 8:
            break
        image = lift(image, pad)
        total_pad += pad

    crown = crown_y(image)
    if crown is None:
        no_face.append(number)
        continue
    final = crown / height
    if start is None:
        start = final
    if final >= min(TARGET, 0.12) and start < TARGET:
        imwrite_unicode(path, image)
        changed.append((number, start, final))
    else:
        skipped.append((number, final))

print(f"target headroom {TARGET * 100:.0f}%\n")
for number, before, after in changed:
    print(f"  lifted {number:>3}: {before * 100:5.1f}% -> {after * 100:5.1f}%")
if skipped:
    print("  left as is:", ", ".join(f"{n}({h * 100:.0f}%)" for n, h in skipped))
if no_face:
    print("  no face detected:", ", ".join(str(n) for n in no_face))

with open(os.path.join(ROOT, "docs", "headroom.json"), "w", encoding="utf-8") as sink:
    json.dump({"target": TARGET, "lifted": [{"number": n, "before": round(b, 4), "after": round(a, 4)} for n, b, a in changed]}, sink, indent=2)

print("\nnext: node tools/embed-photos.mjs")
