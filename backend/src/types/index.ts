export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'operator' | 'viewer';
  created_at: Date;
  updated_at: Date;
}

export interface Robot {
  id: number;
  robot_id: string;
  name: string;
  model: string;
  status: 'active' | 'inactive' | 'maintenance' | 'charging' | 'offline';
  location_x: number;
  location_y: number;
  battery_level: number;
  last_seen: Date;
  configuration: RobotConfiguration;
  created_at: Date;
  updated_at: Date;
}

export interface RobotConfiguration {
  max_speed?: number;
  sensor_sensitivity?: number;
  auto_charge_threshold?: number;
  patrol_route?: Array<{ x: number; y: number }>;
  emergency_stop_enabled?: boolean;
  [key: string]: any;
}

export interface TelemetryData {
  id: number;
  robot_id: number;
  timestamp: Date;
  location_x: number;
  location_y: number;
  battery_level: number;
  status: string;
  speed: number;
  temperature: number;
  additional_data: Record<string, any>;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RobotFilter {
  status?: string;
  model?: string;
  battery_min?: number;
  battery_max?: number;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface TelemetryUpdate {
  robot_id: string;
  location_x: number;
  location_y: number;
  battery_level: number;
  status: Robot['status'];
  speed: number;
  temperature: number;
  timestamp: Date;
}
