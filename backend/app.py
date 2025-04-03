import os
import boto3
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# AWS Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

# Initialize AWS clients
s3 = boto3.client('s3',
                  aws_access_key_id=AWS_ACCESS_KEY_ID,
                  aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                  region_name=AWS_REGION)

rekognition = boto3.client('rekognition',
                          aws_access_key_id=AWS_ACCESS_KEY_ID,
                          aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                          region_name=AWS_REGION)

dynamodb = boto3.resource('dynamodb',
                         aws_access_key_id=AWS_ACCESS_KEY_ID,
                         aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                         region_name=AWS_REGION)

# DynamoDB table
attendance_table = dynamodb.Table('AttendanceRecords')

# S3 bucket name
S3_BUCKET = os.getenv('S3_BUCKET')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

@app.route('/register', methods=['POST'])
def register_face():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    user_id = request.form.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        s3_key = f'faces/{user_id}/{filename}'
        
        try:
            # Upload to S3
            s3.upload_fileobj(file, S3_BUCKET, s3_key)
            
            # Index face in Rekognition
            response = rekognition.index_faces(
                CollectionId='attendance-faces',
                Image={
                    'S3Object': {
                        'Bucket': S3_BUCKET,
                        'Name': s3_key
                    }
                },
                ExternalImageId=user_id,
                DetectionAttributes=['ALL']
            )
            
            return jsonify({
                'message': 'Face registered successfully',
                'face_id': response['FaceRecords'][0]['Face']['FaceId']
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/recognize', methods=['POST'])
def recognize_face():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try:
            # Upload to S3 temporarily
            temp_key = f'temp/{datetime.now().timestamp()}.jpg'
            s3.upload_fileobj(file, S3_BUCKET, temp_key)
            
            # Search for face in Rekognition
            response = rekognition.search_faces_by_image(
                CollectionId='attendance-faces',
                Image={
                    'S3Object': {
                        'Bucket': S3_BUCKET,
                        'Name': temp_key
                    }
                },
                MaxFaces=1,
                FaceMatchThreshold=70
            )
            
            # Delete temporary file
            s3.delete_object(Bucket=S3_BUCKET, Key=temp_key)
            
            if not response['FaceMatches']:
                return jsonify({'error': 'No matching face found'}), 404
            
            user_id = response['FaceMatches'][0]['Face']['ExternalImageId']
            confidence = response['FaceMatches'][0]['Similarity']
            
            # Record attendance
            attendance_table.put_item(
                Item={
                    'user_id': user_id,
                    'timestamp': datetime.now().isoformat(),
                    'status': 'present',
                    'confidence': str(confidence)
                }
            )
            
            return jsonify({
                'user_id': user_id,
                'confidence': confidence,
                'message': 'Attendance marked successfully'
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/attendance/<user_id>', methods=['GET'])
def get_attendance(user_id):
    try:
        response = attendance_table.query(
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={
                ':uid': user_id
            }
        )
        return jsonify(response['Items']), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 