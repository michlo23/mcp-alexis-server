import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AlexisApiClient } from '../api/alexisApi';
import { LeaveFilters } from '../types/alexis';

/**
 * Register leave-related tools to the MCP server
 */
export const registerLeaveTools = (server: McpServer) => {
  /**
   * getAllLeaves tool - Fetches all leaves from AlexisHR API with optional filtering
   */
  server.registerTool(
    'getAllLeaves',
    {
      title: 'Get All Leaves',
      description: 'Fetches all leaves from AlexisHR API with optional filtering.',
      inputSchema: {
        limit: z.number().optional().default(500),
        filters: z.object({
          employeeId: z.string().optional(),
          typeId: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional(),
      }
    },
    async ({ limit, filters }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
            throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call with all filters including dates
        // API will now handle startDate with $gte and endDate with $lte operators
        const result = await apiClient.getAllLeaves(limit, filters as LeaveFilters);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error in getAllLeaves tool:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to fetch leaves' 
            }, null, 2)
          }]
        };
      }
    }
  );

  /**
   * getLeaveById tool - Fetches a specific leave by its unique ID
   */
  server.registerTool(
    'getLeaveById',
    {
      title: 'Get Leave By ID',
      description: 'Fetches a specific leave by its unique ID.',
      inputSchema: {
        leaveId: z.string(),
      }
    },
    async ({ leaveId }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
            throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call
        const result = await apiClient.getLeaveById(leaveId);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        console.error(`Error in getLeaveById tool (ID: ${leaveId}):`, error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || `Failed to fetch leave with ID ${leaveId}` 
            }, null, 2)
          }]
        };
      }
    }
  );
};
