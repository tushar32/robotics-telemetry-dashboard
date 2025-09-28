# AWS Deployment Guide

This guide provides step-by-step instructions for deploying the Robotics Telemetry Dashboard to AWS.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   Load Balancer │    │   RDS PostgreSQL│
│   (Frontend)    │    │   (Backend)     │    │   (Database)    │
│                 │    │                 │    │                 │
│ • S3 Bucket     │    │ • EC2 Instances │    │ • Multi-AZ      │
│ • CDN           │◄──►│ • Auto Scaling  │◄──►│ • Backups       │
│ • SSL/TLS       │    │ • Health Checks │    │ • Encryption    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- AWS CLI configured with appropriate permissions
- Domain name (optional, for custom domain)
- SSL certificate (can be created via AWS Certificate Manager)


## 🖥️ Backend Deployment (EC2 + Load Balancer)

### Create RDS instance and Security group VPC setup from AWS console

### 1. Create EC2 Launch Template

```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name robotics-backend-template \
  --launch-template-data '{
    "ImageId": "ami-0abcdef1234567890",
    "InstanceType": "t3.small",
    "KeyName": "your-key-pair",
    "SecurityGroupIds": ["sg-87654321"],
    "UserData": "'$(base64 -w 0 user-data.sh)'"
  }'
```

### 2. User Data Script (user-data.sh)

```bash
#!/bin/bash
yum update -y
yum install -y nodejs npm git

# Install PM2 for process management
npm install -g pm2

# Clone and setup application
cd /home/ec2-user
git clone https://github.com/your-repo/robotics-telemetry.git
cd robotics-telemetry/backend

# Install dependencies
npm install
npm run build

# Create environment file
cat > .env << EOF
PORT=3001
NODE_ENV=production
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=robotics_telemetry
DB_USER=postgres
DB_PASSWORD=YourSecurePassword123!
JWT_SECRET=your-production-jwt-secret-key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://your-domain.com
TELEMETRY_UPDATE_INTERVAL=500
ROBOT_COUNT=5
EOF

# Run database migrations
npm run migrate

# Start application with PM2
pm2 start dist/index.js --name robotics-backend
pm2 startup
pm2 save

EOF

```
## 🌐 Frontend Deployment (S3 + CloudFront)

### 1. Build Frontend

```bash
cd frontend

# Create production environment file
cat > .env.production << EOF
REACT_APP_API_URL=https://api.your-domain.com/api
REACT_APP_WS_URL=https://api.your-domain.com
REACT_APP_ENV=production
EOF

# Build for production
npm run build
```

### 2. Create S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://robotics-telemetry-frontend

# Configure bucket for static website hosting
aws s3 website s3://robotics-telemetry-frontend \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync build/ s3://robotics-telemetry-frontend --delete

# Set bucket policy for public read access
aws s3api put-bucket-policy \
  --bucket robotics-telemetry-frontend \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::robotics-telemetry-frontend/*"
      }
    ]
  }'
```

### 3. Create CloudFront Distribution


## 🔒 Security Configuration

### 1. IAM Roles and Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:Connect"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```


## 🚀 Deployment Script

Create a deployment script (`deploy.sh`):

```bash
#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build

# Upload to S3
echo "☁️ Uploading to S3..."
aws s3 sync build/ s3://robotics-telemetry-frontend --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"

# Deploy backend (if using CodeDeploy)
echo "🖥️ Deploying backend..."
cd ../backend
npm run build

# Create deployment package
zip -r deployment.zip dist/ package.json .env

# Upload to S3 for CodeDeploy
aws s3 cp deployment.zip s3://robotics-deployment-bucket/

# Trigger CodeDeploy
aws deploy create-deployment \
  --application-name robotics-backend \
  --deployment-group-name production \
  --s3-location bucket=robotics-deployment-bucket,key=deployment.zip,bundleType=zip

echo "✅ Deployment completed!"
```

## 🔧 Environment-Specific Configurations

### Production Environment Variables

```bash
# Backend production .env
NODE_ENV=production
PORT=3001
DB_HOST=robotics-db.cluster-xyz.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=robotics_telemetry
DB_USER=postgres
DB_PASSWORD=SecureProductionPassword123!
JWT_SECRET=super-secure-jwt-secret-for-production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://dashboard.your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
TELEMETRY_UPDATE_INTERVAL=500
ROBOT_COUNT=5

# Frontend production .env
REACT_APP_API_URL=https://api.your-domain.com/api
REACT_APP_WS_URL=https://api.your-domain.com
REACT_APP_ENV=production
```

## 📈 Scaling Considerations

### Auto Scaling Policies




This deployment guide provides a production-ready setup for the Robotics Telemetry Dashboard on AWS with high availability, security, and scalability considerations.
