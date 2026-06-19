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
        image = cv2.resize(image, (320, 240))
        results = self._get_detector().detect_emotions(image)
        
        if not results:
            return {'faces': []}
        
        faces = []
        for face in results:
            emotions = {k: float(v) for k, v in face['emotions'].items()}
            box = [int(x) for x in face['box']]
            dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0]
            faces.append({
                'box': box,
                'emotions': emotions,
                'dominant_emotion': dominant_emotion
            })
        
        return {'faces': faces}