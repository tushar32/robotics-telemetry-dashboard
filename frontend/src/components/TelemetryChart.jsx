import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import apiService from '../services/api';

const TelemetryChart = ({ robot, telemetryUpdates }) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [chartType, setChartType] = useState('battery');

  useEffect(() => {
    fetchHistoricalData();
  }, [robot.id]);

  const fetchHistoricalData = async () => {
    try {
      const data = await apiService.getRobotTelemetryHistory(robot.id, 100);
      const processedData = data.map((item) => ({
        timestamp: new Date(item.timestamp).getTime(),
        time: format(new Date(item.timestamp), 'HH:mm:ss'),
        battery_level: item.battery_level,
        location_x: item.location_x,
        location_y: item.location_y,
        speed: item.speed,
        temperature: item.temperature,
      }));
      setHistoricalData(processedData);
    } catch (error) {
      console.error('Failed to fetch historical telemetry data:', error);
    }
  };

  const combinedData = React.useMemo(() => {
    const realtimeData = telemetryUpdates.map((update) => ({
      timestamp: new Date(update.timestamp).getTime(),
      time: format(new Date(update.timestamp), 'HH:mm:ss'),
      battery_level: update.battery_level,
      location_x: update.location_x,
      location_y: update.location_y,
      speed: update.speed,
      temperature: update.temperature,
    }));

    const merged = [...historicalData, ...realtimeData]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-100);

    return merged;
  }, [historicalData, telemetryUpdates]);

  const renderBatteryChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={combinedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis 
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          label={{ value: 'Battery %', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          formatter={(value) => [`${value}%`, 'Battery Level']}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="battery_level"
          stroke="#ff9800"
          fill="#ff9800"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderLocationChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={combinedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          label={{ value: 'Position', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          formatter={(value, name) => [
            `${parseFloat(value).toFixed(2)}`, 
            name === 'location_x' ? 'X Position' : 'Y Position'
          ]}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="location_x"
          stroke="#2196f3"
          strokeWidth={2}
          dot={false}
          name="X Position"
        />
        <Line
          type="monotone"
          dataKey="location_y"
          stroke="#4caf50"
          strokeWidth={2}
          dot={false}
          name="Y Position"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderTemperatureChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={combinedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          label={{ value: 'Temperature °C', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          formatter={(value) => [`${parseFloat(value).toFixed(1)}°C`, 'Temperature']}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="temperature"
          stroke="#f44336"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const getCurrentValue = () => {
    if (combinedData.length === 0) return 'N/A';
    const latest = combinedData[combinedData.length - 1];
    
    switch (chartType) {
      case 'battery':
        return `${latest.battery_level}%`;
      case 'location':
        return `(${latest.location_x?.toFixed(2)}, ${latest.location_y?.toFixed(2)})`;
      case 'temperature':
        return `${latest.temperature?.toFixed(1)}°C`;
      default:
        return 'N/A';
    }
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={(_, newType) => newType && setChartType(newType)}
            size="small"
          >
            <ToggleButton value="battery">Battery</ToggleButton>
            <ToggleButton value="location">Location</ToggleButton>
            <ToggleButton value="temperature">Temperature</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Trend
            </Typography>
            {chartType === 'battery' && renderBatteryChart()}
            {chartType === 'location' && renderLocationChart()}
            {chartType === 'temperature' && renderTemperatureChart()}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Current Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Current {chartType}:
                </Typography>
                <Typography variant="h4" color="primary">
                  {getCurrentValue()}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Status:
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: robot.status === 'active' ? 'success.main' :
                         robot.status === 'charging' ? 'warning.main' :
                         robot.status === 'maintenance' ? 'error.main' : 'text.secondary'
                }}>
                  {robot.status.toUpperCase()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  Data Points:
                </Typography>
                <Typography variant="body1">
                  {combinedData.length} samples
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">
                  Last Update:
                </Typography>
                <Typography variant="body2">
                  {combinedData.length > 0 
                    ? format(new Date(combinedData[combinedData.length - 1].timestamp), 'HH:mm:ss')
                    : 'No data'
                  }
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TelemetryChart;
