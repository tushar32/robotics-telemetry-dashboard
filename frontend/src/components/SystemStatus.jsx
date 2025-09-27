import React, { useMemo } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  SmartToy,
  Battery20,
  Warning,
  CheckCircle,
  Error,
  Notifications
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const SystemStatus = ({ robots, connectionStatus, notifications }) => {
  const statusCounts = useMemo(() => {
    const counts = {
      active: 0,
      charging: 0,
      maintenance: 0,
      offline: 0,
      total: robots.length
    };

    robots.forEach(robot => {
      if (robot.status in counts) {
        counts[robot.status]++;
      }
    });

    return counts;
  }, [robots]);

  const avgBattery = useMemo(() => {
    if (robots.length === 0) return 0;
    const total = robots.reduce((sum, robot) => sum + robot.battery_level, 0);
    return Math.round(total / robots.length);
  }, [robots]);

  const lowBatteryRobots = useMemo(() => 
    robots.filter(robot => robot.battery_level < 20)
  , [robots]);

  const maintenanceRobots = useMemo(() => 
    robots.filter(robot => robot.status === 'maintenance')
  , [robots]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      default: return <Notifications color="info" />;
    }
  };

  return (
    <Grid container spacing={2}>
      {/* Fleet Overview */}
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <SmartToy sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" color="primary">
            {statusCounts.total}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Total Robots
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Chip label={`${statusCounts.active} Active`} color="success" size="small" />
            <Chip label={`${statusCounts.offline} Offline`} color="default" size="small" />
          </Box>
        </Paper>
      </Grid>

      {/* Battery Status */}
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Battery20 sx={{ 
            fontSize: 40, 
            color: avgBattery <= 20 ? 'error.main' : 
                   avgBattery <= 50 ? 'warning.main' : 'success.main',
            mb: 1 
          }} />
          <Typography variant="h4" sx={{
            color: avgBattery <= 20 ? 'error.main' : 
                   avgBattery <= 50 ? 'warning.main' : 'success.main'
          }}>
            {avgBattery}%
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Average Battery
          </Typography>
          <LinearProgress
            variant="determinate"
            value={avgBattery}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: avgBattery <= 20 ? 'error.main' :
                               avgBattery <= 50 ? 'warning.main' : 'success.main'
              }
            }}
          />
        </Paper>
      </Grid>

      {/* System Health */}
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          {maintenanceRobots.length === 0 ? (
            <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
          ) : (
            <Warning sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
          )}
          <Typography variant="h4" sx={{
            color: maintenanceRobots.length === 0 ? 'success.main' : 'warning.main'
          }}>
            {maintenanceRobots.length === 0 ? 'OK' : maintenanceRobots.length}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {maintenanceRobots.length === 0 ? 'System Health' : 'Need Maintenance'}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {statusCounts.charging} robots charging
          </Typography>
        </Paper>
      </Grid>

      {/* Connection Status */}
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          {connectionStatus === 'connected' ? (
            <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
          ) : (
            <Error sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
          )}
          <Typography variant="h6" sx={{
            color: connectionStatus === 'connected' ? 'success.main' : 'error.main'
          }}>
            {connectionStatus === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            WebSocket Status
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Real-time updates {connectionStatus === 'connected' ? 'active' : 'inactive'}
          </Typography>
        </Paper>
      </Grid>

      {/* Alerts and Notifications */}
      {(lowBatteryRobots.length > 0 || maintenanceRobots.length > 0 || notifications.length > 0) && (
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning color="warning" />
              Active Alerts
            </Typography>
            <List dense>
              {lowBatteryRobots.map(robot => (
                <ListItem key={`battery-${robot.id}`}>
                  <ListItemIcon>
                    <Battery20 color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${robot.name} - Low Battery`}
                    secondary={`${robot.battery_level}% remaining`}
                  />
                </ListItem>
              ))}
              {maintenanceRobots.map(robot => (
                <ListItem key={`maintenance-${robot.id}`}>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${robot.name} - Maintenance Required`}
                    secondary={`Last seen ${formatDistanceToNow(new Date(robot.last_seen), { addSuffix: true })}`}
                  />
                </ListItem>
              ))}
              {notifications.slice(0, 3).map((notification, index) => (
                <ListItem key={`notification-${index}`}>
                  <ListItemIcon>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.message}
                    secondary={notification.timestamp ? 
                      formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true }) : 
                      'Just now'
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      )}

    </Grid>
  );
};

export default SystemStatus;
