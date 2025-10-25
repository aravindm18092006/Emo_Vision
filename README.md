# Advanced Live Emotion Detection

A simple full-stack project that performs live emotion detection from the browser webcam using a Python Flask backend and the `fer` emotion detection library.

Project layout

```
emotion-recogonition/
  backend/
    app.py            # Flask backend and REST endpoint (/detect)
    model.py          # Wrapper around FER model
    requirements.txt  # Python dependencies
  frontend/
    index.html        # Webcam UI, canvas overlays, Chart.js
    app.js            # Frontend logic (WebRTC, canvas, snapshots)
    styles.css
  README.md
```

Requirements

- Windows (PowerShell) - instructions below target PowerShell
- Python 3.8+ (project was configured with a venv at `env/`)
- Webcam (for testing in browser)

Quick setup (PowerShell)

1. Activate venv (the repo has a venv in `env/`) - run from project root:

```powershell
. .\env\Scripts\Activate.ps1
```

2. Install dependencies (if not already installed). From `backend`:

```powershell
# from project root
cd backend
pip install -r requirements.txt
```

If `requirements.txt` is missing, install these packages:

```powershell
pip install flask flask-cors fer opencv-python pillow numpy
```

Run the backend

```powershell
# from backend folder (with venv active)
python app.py
```

Open the frontend

- Open `frontend/index.html` in a browser (Chrome/Edge). The frontend will access your webcam and call the backend `/detect` endpoint.

Notes & Troubleshooting

- If you get "ModuleNotFoundError: No module named 'flask'", your venv isn't activated or packages are not installed. Ensure you activated the `env` (see step 1) and re-run `pip install -r requirements.txt`.
- FER uses `mtcnn` or other face detectors behind the scenes; the first run may download model files and take extra time.
- If the backend listens on a different port, update `app.js` accordingly.

Optional improvements

- Convert the `/detect` endpoint to use WebSockets for lower-latency streaming.
- Add multi-face analytics dashboard and a history graph (Chart.js is already referenced in `frontend/app.js`).

License

MIT
