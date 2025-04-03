# Face Recognition Attendance System

A cloud-based attendance system using AWS services for face recognition and attendance tracking.

## Features

- Face registration and recognition using AWS Rekognition
- Image storage in AWS S3
- Attendance records in DynamoDB
- React frontend with webcam integration
- Flask backend API

## Prerequisites

- Python 3.8+
- Node.js 14+
- AWS Account with appropriate permissions
- AWS CLI configured with credentials

## AWS Setup

1. Create an S3 bucket for storing face images
2. Create a DynamoDB table named 'AttendanceRecords' with:
   - Partition key: user_id (String)
   - Sort key: timestamp (String)
3. Create a Rekognition collection named 'attendance-faces'
4. Create an IAM user with permissions for:
   - AmazonRekognitionFullAccess
   - AmazonS3FullAccess
   - AmazonDynamoDBFullAccess

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the AWS credentials and bucket name

5. Run the Flask server:
   ```bash
   python app.py
   ```

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. Register a new face:
   - Click "Register Face"
   - Enter a user ID
   - Click the capture button
   - Wait for confirmation

2. Mark attendance:
   - Click "Mark Attendance"
   - Click the capture button
   - The system will recognize the face and mark attendance

## API Endpoints

- `POST /register`: Register a new face
- `POST /recognize`: Recognize a face and mark attendance
- `GET /attendance/<user_id>`: Get attendance records for a user

## Security Considerations

- Use HTTPS in production
- Implement proper authentication
- Set up CORS appropriately
- Use environment variables for sensitive data
- Implement rate limiting
- Regular security audits

## Deployment

### Backend Deployment Options:

1. AWS Elastic Beanstalk
2. AWS Lambda + API Gateway
3. EC2 Instance

### Frontend Deployment Options:

1. AWS S3 + CloudFront
2. AWS Amplify
3. Netlify/Vercel

## License

MIT 