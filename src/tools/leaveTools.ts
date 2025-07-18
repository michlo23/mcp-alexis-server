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
          status: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          duration: z.string().optional(),
          gradePercentage: z.string().optional(),
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
        
        // Extract date filters for local filtering
        const startDateFilter = filters?.startDate;
        const endDateFilter = filters?.endDate;
        
        // Create a new filters object without date filters for the API call
        const apiFilters = { ...filters };
        if (apiFilters) {
          delete apiFilters.startDate;
          delete apiFilters.endDate;
        }
        
        // Make API call with filters excluding dates
        const result = await apiClient.getAllLeaves(limit, apiFilters as LeaveFilters);
        
        // Apply local date filtering if date filters are provided
        if (startDateFilter || endDateFilter) {
          // Filter the leaves based on date criteria
          result.leaves = result.leaves.filter(leave => {
            const leaveStartDate = new Date(leave.startDate);
            const leaveEndDate = new Date(leave.endDate);
            
            // If only startDateFilter is provided
            if (startDateFilter && !endDateFilter) {
              const filterStartDate = new Date(startDateFilter);
              // Return leaves where either startDate or endDate is >= filterStartDate
              return leaveStartDate >= filterStartDate || leaveEndDate >= filterStartDate;
            }
            
            // If only endDateFilter is provided
            if (endDateFilter && !startDateFilter) {
              const filterEndDate = new Date(endDateFilter);
              // Return leaves where either startDate or endDate is <= filterEndDate
              return leaveStartDate <= filterEndDate || leaveEndDate <= filterEndDate;
            }
            
            // If both date filters are provided
            if (startDateFilter && endDateFilter) {
              const filterStartDate = new Date(startDateFilter);
              const filterEndDate = new Date(endDateFilter);
              
              // Return leaves where:
              // 1. Either startDate or endDate is >= filterStartDate AND
              // 2. Either startDate or endDate is <= filterEndDate
              return (leaveStartDate >= filterStartDate || leaveEndDate >= filterStartDate) && 
                     (leaveStartDate <= filterEndDate || leaveEndDate <= filterEndDate);
            }
            
            return true;
          });
          
          // Update the count in metadata
          result.metadata.count = result.leaves.length;
          result.metadata.appliedFilters = filters || {};
        }
        
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
