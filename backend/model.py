from fer import FER
import cv2
import numpy as np

class EmotionDetector:
    def __init__(self):
        self.detector = FER(mtcnn=True)
    
    def detect_emotions(self, image):
        # Detect emotions in the image
        results = self.detector.detect_emotions(image)
        
        if not results:
            return {'faces': []}
        
        # Format the results
        faces = []
        for face in results:
            emotions = face['emotions']
            box = face['box']
            
            # Get the dominant emotion
            dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0]
            
            faces.append({
                'box': box,
                'emotions': emotions,
                'dominant_emotion': dominant_emotion
            })
        
        return {'faces': faces}