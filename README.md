# Real-Time Robotics Telemetry Dashboard

A scalable, secure, and real-time web dashboard for monitoring a fleet of autonomous mobile robots (AMRs) built with the MERN stack and PostgreSQL.

## 🚀 Features

### Backend (Node.js + Express + PostgreSQL)
- **RESTful API** with JWT authentication
- **WebSocket server** for real-time telemetry updates
- **PostgreSQL database** with optimized schema
- **Telemetry simulation** for 5 robots with realistic behavior
- **Rate limiting** and security middleware
- **Pagination and filtering** for robot data
- **Real-time robot configuration updates**

### Frontend (React + TypeScript + Material-UI)
- **Real-time dashboard** with live telemetry updates
- **Interactive robot map** with visual status indicators
- **Telemetry charts** (battery, location, temperature)
- **Robot fleet management** with filtering and search

### Key Technical Features
- **JWT Authentication** for secure API and WebSocket connections
- **Real-time WebSocket communication** with automatic reconnection
- **PostgreSQL** instead of MongoDB for better relational data handling
- **TypeScript** throughout for type safety
- **Material-UI** for modern, accessible UI components
- **Recharts** for interactive data visualization


## 📋 Prerequisites

- **Node.js** (v20 or higher)
- **PostgreSQL** (v16 or higher)
- **npm** or **yarn**

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/tushar32/robotics-telemetry-dashboard
cd delhivery-assignment
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your PostgreSQL credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=robotics_telemetry
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your_jwt_secret_key

# Run database migrations (creates tables and sample data)
npm run migrate

# Start the backend server
npm run dev
```

The backend will start on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start the frontend development server
npm start
```

The frontend will start on `http://localhost:3000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh JWT token

### Robots
- `GET /api/robots` - Get paginated robot list with filters
- `GET /api/robots/:id` - Get specific robot details
- `PUT /api/robots/:id/config` - Update robot configuration (requires auth)
- `GET /api/robots/:id/telemetry` - Get robot telemetry history


## 🔌 WebSocket implementation

### Client → Server
- `subscribe_robot` - Subscribe to specific robot updates
- `unsubscribe_robot` - Unsubscribe from robot updates
- `request_current_states` - Request current robot states
- `ping` - Health check

### Server → Client
- `telemetry_update` - Real-time telemetry updates for all robots
- `robot_update` - Individual robot status updates

## 🤖 Robot Simulation

The system includes a realistic telemetry simulator that:
- Simulates 5 robots with different behaviors
- Updates every 500ms (configurable)
- Includes realistic movement patterns
- Simulates battery drain and charging cycles
- Handles maintenance states and offline scenarios
- Generates temperature variations

### Robot Behaviors
- **Active:** Moving, consuming battery, generating heat
- **Charging:** Stationary, battery increasing, normal temperature
- **Maintenance:** Stationary, random recovery time
- **Offline:** No updates, ambient temperature

## 🎨 Frontend Features

### Dashboard Components
- **System Status:** Fleet overview with key metrics
- **Robot List:** Searchable, filterable list with real-time updates
- **Interactive Map:** Visual representation of robot positions
- **Telemetry Charts:** Battery, location, and temperature trends

## 🚀 AWS Deployment (Production)

### Backend Deployment
1. **EC2 Instance:** Deploy Node.js application
2. **RDS PostgreSQL:** Managed database service
3. **Application Load Balancer:** For high availability
4. **CloudWatch:** Monitoring and logging

### Frontend Deployment
1. **S3 + CloudFront:** Static website hosting with CDN
2. **Route 53:** DNS management

### Security
- **VPC:** Network isolation
- **Security Groups:** Firewall rules
- **IAM Roles:** Access management
- **SSL/TLS:** HTTPS encryption



### High-Performance Structured Logging with Pino

To move beyond `console.log`, the backend uses **Pino**, a high-performance, low-overhead structured logger.

### High-Performance Authentication with `fast-jwt`

The standard `jsonwebtoken` library has been replaced with **`fast-jwt`**, a significantly faster drop-in alternative.

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=robotics_telemetry
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
TELEMETRY_UPDATE_INTERVAL=500
ROBOT_COUNT=5
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001
REACT_APP_ENV=development
```

**Built with ❤️ for Delhivery Technical Assignment**


## 📈 Scalability and High-Volume Data Ingestion

### Design for Ingesting Raw Sensor Data

For a production scenario with 100+ robots generating continuous, high-volume sensor data (e.g., IMU readings, camera metadata, LiDAR points), a direct-to-database approach is not scalable. The backend would be overwhelmed, and the database would become a bottleneck.

A robust and scalable solution involves using a real-time data streaming service to act as a buffer and processing pipeline.

### Recommended Service: Amazon Kinesis

**Amazon Kinesis Data Streams** is the ideal choice for this use case within the AWS ecosystem.

**Justification:**

1.  **Fully Managed & Scalable:** Kinesis is a serverless, fully managed service that automatically handles the provisioning, scaling, and management of the underlying infrastructure. This eliminates significant operational overhead compared to managing a Kafka cluster on EC2.

2.  **Decoupling and Durability:** It decouples the data producers (robots) from the data consumers (our backend services). The stream provides a durable, ordered log of all sensor data for a configurable retention period (e.g., 24 hours), ensuring no data is lost if downstream services are temporarily unavailable.

3.  **Seamless AWS Integration:** Kinesis integrates natively with other AWS services, enabling a powerful serverless processing architecture. The most effective pattern is:

    **Robots → Kinesis Data Stream → AWS Lambda → MongoDB/PostgreSQL**

**How it works:**

1.  **Ingestion:** Each robot sends its raw sensor data directly to a Kinesis Data Stream endpoint. This is a highly available and scalable ingestion point.

2.  **Processing:** A Lambda function is configured to trigger automatically on new records arriving in the stream. This function can perform:
    *   **Filtering:** Discarding noisy or irrelevant data.
    *   **Aggregation:** Calculating averages, minimums, or maximums over a time window (e.g., 1-second average speed).
    *   **Transformation:** Converting data formats.

3.  **Storage:** The processed, aggregated data is then written to the main MongoDB or PostgreSQL database. This ensures that the primary database only receives clean, relevant data at a manageable velocity, preventing it from being overloaded.

This architecture is cost-effective, highly scalable, and resilient, making it a perfect fit for handling high-throughput IoT data streams.



## 📄 License

This project is licensed under the ISC License.

---