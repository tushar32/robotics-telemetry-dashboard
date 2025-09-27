import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Badge,
  Chip
} from '@mui/material';
import {
  Logout,
  Refresh,
  Settings,
  Notifications
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import websocketService from '../services/websocket';
import RobotList from './RobotList';
import RobotMap from './RobotMap';
import TelemetryChart from './TelemetryChart';
import SystemStatus from './SystemStatus';
import RobotConfigForm from './RobotConfigForm';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [robots, setRobots] = useState([]);
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [telemetryUpdates, setTelemetryUpdates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [configFormOpen, setConfigFormOpen] = useState(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const initialData = await apiService.getRobots();
        setRobots(initialData.robots || []);
      } catch (error) {
        console.error('Failed to fetch initial robot data:', error);
      }
    };

    initializeDashboard();

    const setupWebSocketListeners = () => {
      websocketService.on('connect', () => setConnectionStatus('connected'));
      websocketService.on('disconnect', () => setConnectionStatus('disconnected'));
      websocketService.on('telemetry_update', (update) => {
        setTelemetryUpdates(prevUpdates => [...prevUpdates, update]);
        setRobots(prevRobots => 
          prevRobots.map(robot => 
            robot.robot_id === update.robot_id ? { ...robot, ...update } : robot
          )
        );
      });
      websocketService.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
      });
      websocketService.on('initial_robot_states', (initialStates) => {
        setRobots(initialStates);
      });
    };

    setupWebSocketListeners();

    return () => {
      // Cleanup WebSocket listeners if necessary
    };
  }, []);

  const handleRefresh = async () => {
    try {
      const freshData = await apiService.getRobots();
      setRobots(freshData.robots || []);
      websocketService.requestCurrentStates();
    } catch (error) {
      console.error('Failed to refresh robot data:', error);
    }
  };

  const handleRobotSelect = (robot) => {
    setSelectedRobot(robot);
  };

  const handleConfigureRobot = () => {
    if (selectedRobot) {
      setConfigFormOpen(true);
    }
  };

  const handleConfigSuccess = (updatedRobot) => {
    setRobots(prevRobots => 
      prevRobots.map(robot => 
        robot.id === updatedRobot.id ? updatedRobot : robot
      )
    );
    if (selectedRobot?.id === updatedRobot.id) {
      setSelectedRobot(updatedRobot);
    }
  };

  const getConnectionStatusColor = () => {
    return connectionStatus === 'connected' ? 'success' : 'error';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Robotics Telemetry Dashboard
          </Typography>
          
          <Chip
            label={`WebSocket: ${connectionStatus}`}
            color={getConnectionStatusColor()}
            size="small"
            sx={{ mr: 2 }}
          />
          
          <IconButton color="inherit" onClick={handleRefresh}>
            <Refresh />
          </IconButton>
          
          <IconButton 
            color="inherit" 
            onClick={handleConfigureRobot}
            disabled={!selectedRobot || (currentUser?.role !== 'admin' && currentUser?.role !== 'operator')}
            title={selectedRobot ? `Configure ${selectedRobot.name}` : 'Select a robot to configure'}
          >
            <Settings />
          </IconButton>
          
          <IconButton color="inherit">
            <Badge badgeContent={notifications.length} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <Typography variant="body2" sx={{ mx: 2 }}>
            {currentUser?.username} ({currentUser?.role})
          </Typography>
          
          <Button color="inherit" onClick={logout} startIcon={<Logout />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SystemStatus 
              robots={robots}
              connectionStatus={connectionStatus}
              notifications={notifications}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '600px', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Robot Fleet ({robots.length})
              </Typography>
              <RobotList 
                robots={robots}
                selectedRobot={selectedRobot}
                onRobotSelect={handleRobotSelect}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '600px' }}>
              <Typography variant="h6" gutterBottom>
                Fleet Map
              </Typography>
              <RobotMap 
                robots={robots}
                selectedRobot={selectedRobot}
                onRobotSelect={handleRobotSelect}
              />
            </Paper>
          </Grid>

          {selectedRobot && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Telemetry Data - {selectedRobot.name}
                </Typography>
                <TelemetryChart 
                  robot={selectedRobot}
                  telemetryUpdates={telemetryUpdates.filter(
                    update => update.robot_id === selectedRobot.robot_id
                  )}
                />
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      <RobotConfigForm
        robot={selectedRobot}
        open={configFormOpen}
        onClose={() => setConfigFormOpen(false)}
        onSuccess={handleConfigSuccess}
      />
    </Box>
  );
};

export default Dashboard;
