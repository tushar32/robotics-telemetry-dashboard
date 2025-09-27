import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Box,
  Chip
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const RobotConfigForm = ({ robot, open, onClose, onSuccess }) => {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors }
  } = useForm();

  useEffect(() => {
    if (robot && open) {
      // Populate form with current robot configuration
      const config = robot.configuration || {};
      reset({
        max_speed: config.max_speed || 2,
        sensor_sensitivity: config.sensor_sensitivity || 5,
        auto_charge_threshold: config.auto_charge_threshold || 20,
        emergency_stop_enabled: config.emergency_stop_enabled || false,
        patrol_route: JSON.stringify(config.patrol_route || [])
      });
      setError('');
      setSuccess('');
    }
  }, [robot, open, reset]);

  const onSubmit = async (data) => {
    if (!robot) return;

    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      // Parse patrol route JSON
      let patrolRoute = [];
      if (data.patrol_route.trim()) {
        try {
          patrolRoute = JSON.parse(data.patrol_route);
          // Validate patrol route format
          if (!Array.isArray(patrolRoute)) {
            throw new Error('Patrol route must be an array');
          }
          patrolRoute.forEach((point, index) => {
            if (typeof point.x !== 'number' || typeof point.y !== 'number') {
              throw new Error(`Invalid coordinates at point ${index + 1}`);
            }
          });
        } catch (parseError) {
          throw new Error('Invalid patrol route JSON format');
        }
      }

      // Prepare configuration object
      const configuration = {
        max_speed: Number(data.max_speed),
        sensor_sensitivity: Number(data.sensor_sensitivity),
        auto_charge_threshold: Number(data.auto_charge_threshold),
        emergency_stop_enabled: data.emergency_stop_enabled,
        patrol_route: patrolRoute
      };

      // Send PUT request with JWT authorization
      const updatedRobot = await apiService.updateRobotConfiguration(robot.id, configuration);
      
      setSuccess('Robot configuration updated successfully!');
      onSuccess(updatedRobot);
      
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Configuration update error:', err);
      
      // Handle different types of errors
      if (err.response?.status === 401) {
        // Unauthorized - token expired or invalid
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          logout(); // This will redirect to login page
        }, 2000);
      } else if (err.response?.status === 403) {
        // Forbidden - insufficient permissions
        setError('You do not have permission to update robot configurations.');
      } else if (err.response?.status === 404) {
        // Robot not found
        setError('Robot not found. It may have been deleted.');
      } else if (err.response?.status === 400) {
        // Bad request - validation error
        setError(err.response?.data?.error || 'Invalid configuration data.');
      } else if (err.message) {
        // Custom error message (e.g., JSON parsing error)
        setError(err.message);
      } else {
        // Generic error
        setError('Failed to update robot configuration. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      setError('');
      setSuccess('');
      onClose();
    }
  };

  const validatePatrolRoute = (value) => {
    if (!value.trim()) return true; // Empty is valid
    
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return 'Patrol route must be an array of coordinates';
      }
      
      for (let i = 0; i < parsed.length; i++) {
        const point = parsed[i];
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
          return `Invalid coordinates at point ${i + 1}. Expected format: {"x": number, "y": number}`;
        }
        if (point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) {
          return `Coordinates at point ${i + 1} must be between 0 and 100`;
        }
      }
      
      return true;
    } catch {
      return 'Invalid JSON format. Use format: [{"x": 10, "y": 20}, {"x": 30, "y": 40}]';
    }
  };

  if (!robot) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Configure Robot: {robot.name}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          ID: {robot.robot_id} | Model: {robot.model}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Current Status */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip 
                  label={`Status: ${robot.status}`} 
                  color={robot.status === 'active' ? 'success' : 'default'}
                />
                <Chip 
                  label={`Battery: ${robot.battery_level}%`}
                  color={robot.battery_level > 50 ? 'success' : 'warning'}
                />
                <Chip 
                  label={`Location: (${robot.location_x.toFixed(1)}, ${robot.location_y.toFixed(1)})`}
                />
              </Box>
            </Grid>

            {/* Max Speed */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="max_speed"
                control={control}
                rules={{
                  required: 'Max speed is required',
                  min: { value: 0.1, message: 'Min speed is 0.1' },
                  max: { value: 10, message: 'Max speed is 10' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Max Speed (m/s)"
                    type="number"
                    inputProps={{ step: 0.1, min: 0.1, max: 10 }}
                    error={!!errors.max_speed}
                    helperText={errors.max_speed?.message || 'Maximum robot speed (0.1 - 10 m/s)'}
                  />
                )}
              />
            </Grid>

            {/* Sensor Sensitivity */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="sensor_sensitivity"
                control={control}
                rules={{
                  required: 'Sensor sensitivity is required',
                  min: { value: 1, message: 'Min sensitivity is 1' },
                  max: { value: 10, message: 'Max sensitivity is 10' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Sensor Sensitivity"
                    type="number"
                    inputProps={{ step: 1, min: 1, max: 10 }}
                    error={!!errors.sensor_sensitivity}
                    helperText={errors.sensor_sensitivity?.message || 'Sensor sensitivity level (1-10)'}
                  />
                )}
              />
            </Grid>

            {/* Auto Charge Threshold */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="auto_charge_threshold"
                control={control}
                rules={{
                  required: 'Auto charge threshold is required',
                  min: { value: 5, message: 'Min threshold is 5%' },
                  max: { value: 50, message: 'Max threshold is 50%' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Auto Charge Threshold (%)"
                    type="number"
                    inputProps={{ step: 1, min: 5, max: 50 }}
                    error={!!errors.auto_charge_threshold}
                    helperText={errors.auto_charge_threshold?.message || 'Battery level to trigger auto-charging (5-50%)'}
                  />
                )}
              />
            </Grid>

            {/* Emergency Stop */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="emergency_stop_enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={field.onChange}
                        color="primary"
                      />
                    }
                    label="Emergency Stop Enabled"
                  />
                )}
              />
              <Typography variant="caption" color="textSecondary" display="block">
                Enable emergency stop functionality
              </Typography>
            </Grid>

            {/* Patrol Route */}
            <Grid item xs={12}>
              <Controller
                name="patrol_route"
                control={control}
                rules={{
                  validate: validatePatrolRoute
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Patrol Route (JSON)"
                    multiline
                    rows={4}
                    error={!!errors.patrol_route}
                    helperText={
                      errors.patrol_route?.message || 
                      'JSON array of coordinates: [{"x": 10, "y": 20}, {"x": 30, "y": 40}]. Leave empty for no patrol route.'
                    }
                    placeholder='[{"x": 10, "y": 20}, {"x": 50, "y": 80}, {"x": 90, "y": 30}]'
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Updating...' : 'Update Configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RobotConfigForm;
