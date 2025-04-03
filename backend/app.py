from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# AWS Configuration
AWS_CONFIG = {
    'S3_BUCKET': 'face-attendance-images',
    'REKOGNITION_COLLECTION': 'face-attendance',
    'DYNAMODB_TABLE': 'AttendanceRecords',
    'REGION': 'us-east-1'
}

# Add this at the top of your Flask app to verify AWS credentials
sts = boto3.client('sts')
try:
    print(sts.get_caller_identity())
except Exception as e:
    print("AWS Credentials Error:", str(e))
    
    
# Initialize AWS clients
s3 = boto3.client('s3', region_name=AWS_CONFIG['REGION'])
rekognition = boto3.client('rekognition', region_name=AWS_CONFIG['REGION'])
dynamodb = boto3.resource('dynamodb', region_name=AWS_CONFIG['REGION'])
attendance_table = dynamodb.Table(AWS_CONFIG['DYNAMODB_TABLE'])

@app.route('/register', methods=['POST'])
def register_face():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    user_id = request.form.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
    
    try:
        # Upload to S3
        s3_key = f'faces/{user_id}/{file.filename}'
        s3.upload_fileobj(file, AWS_CONFIG['S3_BUCKET'], s3_key)
        
        # Index face in Rekognition
        response = rekognition.index_faces(
            CollectionId=AWS_CONFIG['REKOGNITION_COLLECTION'],
            Image={'S3Object': {'Bucket': AWS_CONFIG['S3_BUCKET'], 'Name': s3_key}},
            ExternalImageId=user_id
        )
        
        return jsonify({
            'message': 'Face registered successfully',
            'face_id': response['FaceRecords'][0]['Face']['FaceId']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recognize', methods=['POST'])
def recognize_face():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    try:
        # 1. Upload to S3 temporarily
        temp_key = f'temp/{datetime.now().timestamp()}.jpg'
        s3.upload_fileobj(file, AWS_CONFIG['S3_BUCKET'], temp_key)
        
        # 2. Search for face
        response = rekognition.search_faces_by_image(
            CollectionId=AWS_CONFIG['REKOGNITION_COLLECTION'],
            Image={'S3Object': {
                'Bucket': AWS_CONFIG['S3_BUCKET'],
                'Name': temp_key
            }},
            FaceMatchThreshold=90,
            MaxFaces=1
        )
        
        # 3. Clean up temp file
        s3.delete_object(Bucket=AWS_CONFIG['S3_BUCKET'], Key=temp_key)
        
        if not response.get('FaceMatches'):
            return jsonify({'error': 'No matching face found'}), 404
        
        best_match = response['FaceMatches'][0]
        user_id = best_match['Face']['ExternalImageId']
        face_id = best_match['Face']['FaceId']  # Get the FaceId from Rekognition
        
        # 4. Record attendance - NOW INCLUDING THE FACE_ID
        attendance_table.put_item(
            Item={
                'FaceId': face_id,  # Required partition key
                'user_id': user_id,
                'timestamp': datetime.now().isoformat(),
                'confidence': str(best_match['Similarity']),
                'status': 'present'
            }
        )
        
        return jsonify({
            'user_id': user_id,
            'face_id': face_id,
            'confidence': best_match['Similarity'],
            'message': 'Attendance marked successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)