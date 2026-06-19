from fer import FER
import cv2
import numpy as np

class EmotionDetector:
    def __init__(self):
        self.detector = None

    def _get_detector(self):
        if self.detector is None:
            self.detector = FER(mtcnn=False)
        return self.detector
    
    def detect_emotions(self, image):
        orig_h, orig_w = image.shape[:2]
        resized = cv2.resize(image, (320, 240))
        results = self._get_detector().detect_emotions(resized)
        
        if not results:
            return {'faces': []}
        
        scale_x = orig_w / 320
        scale_y = orig_h / 240
        
        faces = []
        for face in results:
            emotions = {k: float(v) for k, v in face['emotions'].items()}
            x, y, w, h = face['box']
            box = [int(x * scale_x), int(y * scale_y), int(w * scale_x), int(h * scale_y)]
            dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0]
            faces.append({
                'box': box,
                'emotions': emotions,
                'dominant_emotion': dominant_emotion
            })
        
        return {'faces': faces}