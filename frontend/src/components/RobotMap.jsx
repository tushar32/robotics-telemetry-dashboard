import React, { useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const RobotMap = ({ robots, selectedRobot, onRobotSelect }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    drawMap();
  }, [robots, selectedRobot]);

  const getStatusColor = (status) => {
    const colors = {
      active: '#4caf50',
      charging: '#ff9800',
      maintenance: '#f44336',
      offline: '#9e9e9e',
      inactive: '#757575'
    };
    return colors[status] || colors.offline;
  };

  const drawRobot = (ctx, robot, width, height) => {
    const x = (robot.location_x / 100) * width;
    const y = (robot.location_y / 100) * height;
    const radius = 10;
    const color = getStatusColor(robot.status);

    // Draw robot circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw border for selected robot
    if (selectedRobot?.id === robot.id) {
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw robot ID
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(robot.robot_id.split('-')[1] || robot.robot_id.slice(-3), x, y);

    // Draw battery level indicator
    const batteryWidth = 16;
    const batteryHeight = 4;
    const batteryX = x - batteryWidth / 2;
    const batteryY = y + radius + 4;

    // Battery background
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(batteryX, batteryY, batteryWidth, batteryHeight);

    // Battery level
    const batteryLevel = (robot.battery_level / 100) * batteryWidth;
    ctx.fillStyle = robot.battery_level <= 20 ? '#f44336' : 
                   robot.battery_level <= 50 ? '#ff9800' : '#4caf50';
    ctx.fillRect(batteryX, batteryY, batteryLevel, batteryHeight);

    // Battery border
    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 1;
    ctx.strokeRect(batteryX, batteryY, batteryWidth, batteryHeight);
  };

  const drawGrid = (ctx, width, height) => {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= width; x += width / 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += height / 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
  };

  const drawMap = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width - 32; 
    canvas.height = rect.height - 80; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    robots.forEach(robot => {
      drawRobot(ctx, robot, canvas.width, canvas.height);
    });
  };

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    robots.forEach(robot => {
      const x = (robot.location_x / 100) * canvas.width;
      const y = (robot.location_y / 100) * canvas.height;
      const radius = 12;

      const distance = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);
      if (distance <= radius) {
        onRobotSelect(robot);
      }
    });
  };

  const getRobotAtPosition = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    for (const robot of robots) {
      const robotX = (robot.location_x / 100) * canvas.width;
      const robotY = (robot.location_y / 100) * canvas.height;
      const distance = Math.sqrt((x - robotX) ** 2 + (y - robotY) ** 2);
      
      if (distance <= 12) {
        return robot;
      }
    }
    return null;
  };

  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const robot = getRobotAtPosition(mouseX, mouseY);
    canvas.style.cursor = robot ? 'pointer' : 'default';
  };

  return (
    <Box ref={containerRef} sx={{ height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          display: 'block',
          margin: '0 auto'
        }}
      />
      
      {/* Legend */}
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        p: 1,
        borderRadius: 1,
        border: '1px solid #e0e0e0'
      }}>
        <Typography variant="caption" display="block" fontWeight="bold">
          Status Legend:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', borderRadius: '50%' }} />
            <Typography variant="caption">Active</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#ff9800', borderRadius: '50%' }} />
            <Typography variant="caption">Charging</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#f44336', borderRadius: '50%' }} />
            <Typography variant="caption">Maintenance</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#9e9e9e', borderRadius: '50%' }} />
            <Typography variant="caption">Offline</Typography>
          </Box>
        </Box>
      </Box>

      {/* Selected Robot Info */}
      {selectedRobot && (
        <Box sx={{ 
          position: 'absolute', 
          bottom: 8, 
          left: 8, 
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          p: 2,
          borderRadius: 1,
          border: '1px solid #e0e0e0',
          minWidth: 200
        }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {selectedRobot.name}
          </Typography>
          <Typography variant="caption" display="block">
            ID: {selectedRobot.robot_id}
          </Typography>
          <Typography variant="caption" display="block">
            Position: ({selectedRobot.location_x.toFixed(1)}, {selectedRobot.location_y.toFixed(1)})
          </Typography>
          <Typography variant="caption" display="block">
            Battery: {selectedRobot.battery_level}%
          </Typography>
          <Typography variant="caption" display="block">
            Status: {selectedRobot.status}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default RobotMap;
