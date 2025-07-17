import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AlexisApiClient } from '../api/alexisApi';
import { EmployeeFilters } from '../types/alexis';
import { Request } from 'express';

/**
 * Register employee-related tools to the MCP server
 */
export const registerEmployeeTools = (server: McpServer) => {
  /**
   * getAllEmployees tool - Fetches all employees from AlexisHR API with optional filtering and pagination
   */
  server.registerTool(
    'getAllEmployees',
    {
      title: 'Get All Employees',
      description: 'Fetches all employees from AlexisHR API with optional filtering and pagination.',
      inputSchema: {
        limit: z.number().optional().default(500),
        filters: z.object({
          active: z.boolean().optional(),
          title: z.string().optional(),
          division: z.string().optional(),
          organization: z.string().optional(),
          employeeNumber: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          nationality: z.string().optional(),
        }).optional(),
      }
    },

    // , context: { jwtToken?: string }) => {
    // if (!context.jwtToken) throw new Error('Unauthorized');
    async ({ limit, filters }, context: any) => {
      try {
        // Get JWT token from request
        console.error(context);
        console.error(context.requestInfo.headers.authorization);
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }
        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call
        const result = await apiClient.getAllEmployees(limit, filters as EmployeeFilters);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error in getAllEmployees tool:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to fetch employees' 
            }, null, 2)
          }]
        };
      }
    }
  );

  /**
   * getEmployeeById tool - Fetches a specific employee by their unique ID
   */
  server.registerTool(
    'getEmployeeById',
    {
      title: 'Get Employee By ID',
      description: 'Fetches a specific employee by their unique ID.',
      inputSchema: {
        employeeId: z.string(),
      }
    },
    async ({ employeeId }, context: any) => {
      try {
        // Get JWT token from request
        console.error(context);
        console.error(context.requestInfo.headers.authorization);
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call
        const result = await apiClient.getEmployeeById(employeeId);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        console.error(`Error in getEmployeeById tool (ID: ${employeeId}):`, error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || `Failed to fetch employee with ID ${employeeId}` 
            }, null, 2)
          }]
        };
      }
    }
  );
};
