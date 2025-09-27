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

## 🗄️ Database Setup (RDS PostgreSQL)

### 1. Create RDS Instance

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name robotics-db-subnet-group \
  --db-subnet-group-description "Subnet group for robotics telemetry DB" \
  --subnet-ids subnet-12345678 subnet-87654321

# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier robotics-telemetry-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.9 \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-name robotics_telemetry \
  --vpc-security-group-ids sg-12345678 \
  --db-subnet-group-name robotics-db-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

### 2. Security Group for RDS

```bash
# Create security group for RDS
aws ec2 create-security-group \
  --group-name robotics-db-sg \
  --description "Security group for robotics telemetry database"

# Allow PostgreSQL access from EC2 instances
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-87654321
```

## 🖥️ Backend Deployment (EC2 + Load Balancer)

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

# Configure nginx as reverse proxy
yum install -y nginx
cat > /etc/nginx/conf.d/robotics.conf << EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

systemctl start nginx
systemctl enable nginx
```

### 3. Create Auto Scaling Group

```bash
# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name robotics-backend-asg \
  --launch-template LaunchTemplateName=robotics-backend-template,Version=1 \
  --min-size 1 \
  --max-size 3 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:region:account:targetgroup/robotics-backend-tg/1234567890123456 \
  --vpc-zone-identifier "subnet-12345678,subnet-87654321"
```

### 4. Application Load Balancer

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
  --name robotics-backend-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678

# Create target group
aws elbv2 create-target-group \
  --name robotics-backend-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-12345678 \
  --health-check-path /health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:region:account:loadbalancer/app/robotics-backend-alb/1234567890123456 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/robotics-backend-tg/1234567890123456
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
