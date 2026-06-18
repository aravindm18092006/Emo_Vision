from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from model import EmotionDetector
import base64
import cv2
import numpy as np
from PIL import Image
import io
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://emo-vision-xi.vercel.app",
            "https://emo-vision.vercel.app",
            "http://localhost:5000",
            "http://127.0.0.1:5000"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize emotion detector
emotion_detector = EmotionDetector()

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/detect', methods=['POST'])
def detect_emotion():
    try:
        # Get the image data from the request
        data = request.json
        image_data = data['image'].split(',')[1]
        
        # Convert base64 to image
        img_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(img_bytes))
        img_array = np.array(img)
        
        # Convert RGB to BGR (for OpenCV)
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        
        # Detect emotions
        results = emotion_detector.detect_emotions(img_bgr)
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save_snapshot', methods=['POST'])
def save_snapshot():
    try:
        app.logger.info('Received snapshot save request')
        
        # Validate request data
        if not request.json or 'image' not in request.json or 'timestamp' not in request.json:
            app.logger.error('Invalid request data')
            return jsonify({'success': False, 'error': 'Invalid request data'}), 400
        
        data = request.json
        image_data = data['image']
        
        # Ensure the image data is properly formatted
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        timestamp = data['timestamp']
        
        # Create static directory if it doesn't exist
        static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static')
        app.logger.info(f'Static directory path: {static_dir}')
        
        try:
            if not os.path.exists(static_dir):
                os.makedirs(static_dir)
                app.logger.info(f'Created static directory: {static_dir}')
        except Exception as e:
            app.logger.error(f'Error creating static directory: {str(e)}')
            return jsonify({'success': False, 'error': 'Could not create storage directory'}), 500
        
        try:
            # Convert base64 to image
            img_bytes = base64.b64decode(image_data)
        except Exception as e:
            app.logger.error(f'Error decoding base64 image: {str(e)}')
            return jsonify({'success': False, 'error': 'Invalid image data'}), 400
        
        try:
            # Save image with full path
            filename = f'snapshot_{timestamp}.jpg'
            filepath = os.path.join(static_dir, filename)
            app.logger.info(f'Saving snapshot to: {filepath}')
            
            with open(filepath, 'wb') as f:
                f.write(img_bytes)
            
            app.logger.info('Snapshot saved successfully')
            return jsonify({
                'success': True,
                'filename': f'/static/{filename}',
                'filepath': filepath
            })
            
        except Exception as e:
            app.logger.error(f'Error saving image file: {str(e)}')
            return jsonify({'success': False, 'error': f'Could not save image: {str(e)}'}), 500
            
    except Exception as e:
        app.logger.error(f'Unexpected error in save_snapshot: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)