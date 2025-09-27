import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  LinearProgress
} from '@mui/material';
import {
  SmartToy,
  Battery20,
  Battery50,
  Battery80,
  BatteryFull,
  BatteryAlert
} from '@mui/icons-material';

const RobotList = ({ robots, selectedRobot, onRobotSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getBatteryIcon = (level) => {
    if (level <= 20) return <BatteryAlert color="error" />;
    if (level <= 40) return <Battery20 color="warning" />;
    if (level <= 60) return <Battery50 color="warning" />;
    if (level <= 80) return <Battery80 color="success" />;
    return <BatteryFull color="success" />;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'charging': return 'warning';
      case 'maintenance': return 'error';
      case 'offline': return 'default';
      default: return 'default';
    }
  };

  const filteredRobots = robots.filter(robot => {
    const matchesSearch = robot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         robot.robot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         robot.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || robot.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Search robots..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 1 }}
        />
        <FormControl fullWidth size="small">
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            label="Status Filter"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="charging">Charging</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="offline">Offline</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Robot List */}
      <List sx={{ maxHeight: '450px', overflow: 'auto' }}>
        {filteredRobots.length === 0 ? (
          <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
            No robots found matching your criteria
          </Typography>
        ) : (
          filteredRobots.map((robot) => (
            <ListItem key={robot.id} disablePadding>
              <ListItemButton
                selected={selectedRobot?.id === robot.id}
                onClick={() => onRobotSelect(robot)}
                sx={{
                  border: selectedRobot?.id === robot.id ? 2 : 0,
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <SmartToy />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {robot.name}
                      </Typography>
                      <Chip
                        label={robot.status}
                        color={getStatusColor(robot.status)}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        ID: {robot.robot_id} | Model: {robot.model}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {getBatteryIcon(robot.battery_level)}
                        <Typography variant="caption">
                          {robot.battery_level}%
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          • Last seen {formatDistanceToNow(new Date(robot.last_seen), { addSuffix: true })}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={robot.battery_level}
                        sx={{
                          mt: 0.5,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: robot.battery_level <= 20 ? 'error.main' :
                                           robot.battery_level <= 50 ? 'warning.main' : 'success.main'
                          }
                        }}
                      />
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
};

export default RobotList;
