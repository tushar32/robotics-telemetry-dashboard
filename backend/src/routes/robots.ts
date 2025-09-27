import { Router, Request, Response } from 'express';
import logger from '../config/logger';
import { RobotService } from '../services/robotService';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { ApiResponse, RobotFilter, PaginationParams } from '../types';

const router = Router();
const robotService = new RobotService();

// GET /api/robots - Get paginated and filterable list of robots
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    const pagination: PaginationParams = { page, limit, offset };

    // Parse filter parameters
    const filters: RobotFilter = {};
    
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    
    if (req.query.model) {
      filters.model = req.query.model as string;
    }
    
    if (req.query.battery_min) {
      filters.battery_min = parseInt(req.query.battery_min as string);
    }
    
    if (req.query.battery_max) {
      filters.battery_max = parseInt(req.query.battery_max as string);
    }
    
    if (req.query.search) {
      filters.search = req.query.search as string;
    }

    const { robots, total } = await robotService.getAllRobots(filters, pagination);
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse = {
      success: true,
      data: robots,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching robots');
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching robots'
    });
  }
});

// GET /api/robots/:id - Get specific robot by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const robotId = parseInt(req.params.id);
    
    if (isNaN(robotId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid robot ID'
      });
    }

    const robot = await robotService.getRobotById(robotId);
    
    if (!robot) {
      return res.status(404).json({
        success: false,
        error: 'Robot not found'
      });
    }

    res.json({
      success: true,
      data: robot
    });
  } catch (error) {
    logger.error({ err: error, robotId: req.params.id }, 'Error fetching robot');
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching robot'
    });
  }
});

// PUT /api/robots/:id/config - Update robot configuration (requires authentication)
router.put('/:id/config', authenticateToken, authorizeRoles('admin', 'operator'), async (req: Request, res: Response) => {
  try {
    const robotId = parseInt(req.params.id);
    
    if (isNaN(robotId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid robot ID'
      });
    }

    const { configuration } = req.body;
    
    if (!configuration || typeof configuration !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid configuration object is required'
      });
    }

    // Validate configuration fields (basic validation)
    const allowedFields = [
      'max_speed', 
      'sensor_sensitivity', 
      'auto_charge_threshold', 
      'patrol_route', 
      'emergency_stop_enabled'
    ];
    
    const configKeys = Object.keys(configuration);
    const hasValidFields = configKeys.some(key => allowedFields.includes(key));
    
    if (!hasValidFields) {
      return res.status(400).json({
        success: false,
        error: 'Configuration must contain at least one valid field'
      });
    }

    // Check if robot exists
    const existingRobot = await robotService.getRobotById(robotId);
    if (!existingRobot) {
      return res.status(404).json({
        success: false,
        error: 'Robot not found'
      });
    }

    // Merge with existing configuration
    const mergedConfig = {
      ...existingRobot.configuration,
      ...configuration
    };

    const updatedRobot = await robotService.updateRobotConfiguration(robotId, mergedConfig);
    
    if (!updatedRobot) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update robot configuration'
      });
    }

    res.json({
      success: true,
      data: updatedRobot,
      message: 'Robot configuration updated successfully'
    });
  } catch (error) {
    logger.error({ err: error, robotId: req.params.id }, 'Error updating robot configuration');
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating robot configuration'
    });
  }
});

// GET /api/robots/:id/telemetry - Get telemetry history for a robot
router.get('/:id/telemetry', authenticateToken, async (req: Request, res: Response) => {
  try {
    const robotId = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    
    if (isNaN(robotId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid robot ID'
      });
    }

    const telemetryHistory = await robotService.getTelemetryHistory(robotId, limit);
    
    res.json({
      success: true,
      data: telemetryHistory
    });
  } catch (error) {
    logger.error({ err: error, robotId: req.params.id }, 'Error fetching telemetry history');
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching telemetry history'
    });
  }
});

export default router;
