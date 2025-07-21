import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AlexisApiClient } from '../api/alexisApi';
import { Request } from 'express';

/**
 * Register office-related tools to the MCP server
 */
export const registerOfficeTools = (server: McpServer) => {
  /**
   * getAllOffices tool - Fetches all offices from AlexisHR API with optional filtering, sorting, and pagination
   */
  server.registerTool(
    'getAllOffices',
    {
      title: 'Get All Offices',
      description: 'Fetches all offices from AlexisHR API with optional filtering, sorting, and pagination.',
      inputSchema: {
        limit: z.number().optional().default(500),
        offset: z.number().optional().default(0),
        select: z.string().optional().default("id,name,location,address,city,country,postalCode"),
        sort: z.string().optional(),
        filters: z.object({
          name: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
        }).optional(),
      }
    },
    async ({ limit, offset, select, sort, filters }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call
        const result = await apiClient.getAllOffices({
          limit,
          offset,
          select,
          sort,
          filters
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error fetching offices:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to fetch offices' 
            }, null, 2)
          }]
        };
      }
    }
  );

  /**
   * getOfficeById tool - Fetches a specific office by ID
   */
  server.registerTool(
    'getOfficeById',
    {
      title: 'Get Office by ID',
      description: 'Fetches a specific office by ID from AlexisHR API.',
      inputSchema: {
        officeId: z.string(),
        select: z.string().optional().default("id,name,location,address,city,country,postalCode"),
      }
    },
    async ({ officeId, select }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call
        const result = await apiClient.getOfficeById(officeId, select);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        console.error(`Error fetching office ${officeId}:`, error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: `Failed to fetch office ${officeId}: ${error.message}` 
            }, null, 2)
          }]
        };
      }
    }
  );
};
