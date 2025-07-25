import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AlexisApiClient } from '../api/alexisApi';
import { EmployeeFilters, OffboardingFilters } from '../types/alexis';
import { Request } from 'express';
import { calculateDemographicCounts, DemographicCounts } from '../utils/countUtils';

// Helper type for count results
interface CountResult {
  id: string;
  name: string;
  count: number;
  demographics?: DemographicCounts;
}

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
          departmentId: z.string().optional(),
          officeId: z.string().optional(),
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
        employeeId: z.string()
      }
    },
    async ({ employeeId }, context: any) => {
      try {
        // Get JWT token from request
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
        console.error(`Error in getEmployeeById tool for employee ${employeeId}:`, error);
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
  
  /**
   * getEmployeeCountByDepartment tool - Returns the count of active employees grouped by department
   */
  server.registerTool(
    'getEmployeeCountByDepartment',
    {
      title: 'Get Employee Count By Department',
      description: 'Returns the count of active employees grouped by department.',
      inputSchema: {
        onlyActive: z.boolean().optional().default(true),
      }
    },
    async ({ onlyActive }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call to get all employees
        const filters = onlyActive ? { active: true } : {};
        const limit = 1000; // Set a higher limit to ensure we get all employees
        const result = await apiClient.getAllEmployees(limit, filters as EmployeeFilters);
        
        // Get all departments for name lookup
        const departmentsResult = await apiClient.getAllDepartments();
        const departments = departmentsResult.departments;
        
        // Create a map of department id to name
        const departmentMap = new Map();
        departments.forEach(dept => {
          departmentMap.set(dept.id, dept.name);
        });
        
        // Group employees by department
        const departmentCounts: Record<string, CountResult> = {};
        const departmentEmployees: Record<string, Array<any>> = {};
        
        result.employees.forEach(employee => {
          if (employee.departmentId) {
            if (!departmentCounts[employee.departmentId]) {
              departmentCounts[employee.departmentId] = {
                id: employee.departmentId,
                name: departmentMap.get(employee.departmentId) || 'Unknown Department',
                count: 0
              };
              departmentEmployees[employee.departmentId] = [];
            }
            departmentCounts[employee.departmentId].count++;
            departmentEmployees[employee.departmentId].push(employee);
          }
        });
        
        // Calculate demographic sub-counts for each department
        Object.keys(departmentCounts).forEach(deptId => {
          departmentCounts[deptId].demographics = calculateDemographicCounts(departmentEmployees[deptId]);
        });
        
        // Convert to array and sort by count (descending)
        const countArray = Object.values(departmentCounts).sort((a, b) => b.count - a.count);
        
        const responseData = {
          counts: countArray,
          totalCount: result.employees.length,
          filter: onlyActive ? 'active employees only' : 'all employees'
        };

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(responseData, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error fetching employee counts by department:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to fetch employee counts by department' 
            }, null, 2)
          }]
        };
      }
    }
  );
  
  /**
   * getEmployeeCountByOffice tool - Returns the count of active employees grouped by office
   */
  server.registerTool(
    'getEmployeeCountByOffice',
    {
      title: 'Get Employee Count By Office',
      description: 'Returns the count of active employees grouped by office.',
      inputSchema: {
        onlyActive: z.boolean().optional().default(true),
      }
    },
    async ({ onlyActive }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call to get all employees
        const filters = onlyActive ? { active: true } : {};
        const limit = 1000; // Set a higher limit to ensure we get all employees
        const result = await apiClient.getAllEmployees(limit, filters as EmployeeFilters);
        
        // Get all offices for name lookup
        const officesResult = await apiClient.getAllOffices();
        const offices = officesResult.offices;
        
        // Create a map of office id to name
        const officeMap = new Map();
        offices.forEach(office => {
          officeMap.set(office.id, office.name);
        });
        
        // Group employees by office
        const officeCounts: Record<string, CountResult> = {};
        const officeEmployees: Record<string, Array<any>> = {};
        
        result.employees.forEach(employee => {
          if (employee.officeId) {
            if (!officeCounts[employee.officeId]) {
              officeCounts[employee.officeId] = {
                id: employee.officeId,
                name: officeMap.get(employee.officeId) || 'Unknown Office',
                count: 0
              };
              officeEmployees[employee.officeId] = [];
            }
            officeCounts[employee.officeId].count++;
            officeEmployees[employee.officeId].push(employee);
          }
        });
        
        // Calculate demographic sub-counts for each office
        Object.keys(officeCounts).forEach(officeId => {
          officeCounts[officeId].demographics = calculateDemographicCounts(officeEmployees[officeId]);
        });
        
        // Convert to array and sort by count (descending)
        const countArray = Object.values(officeCounts).sort((a, b) => b.count - a.count);
        
        const responseData = {
          counts: countArray,
          totalCount: result.employees.length,
          filter: onlyActive ? 'active employees only' : 'all employees'
        };

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(responseData, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error fetching employee counts by office:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to fetch employee counts by office' 
            }, null, 2)
          }]
        };
      }
    }
  );

  /**
   * updateEmployee tool - Updates an employee's fields
   */
  server.registerTool(
    'updateEmployee',
    {
      title: 'Update Employee',
      description: 'Updates specific fields of an employee record.',
      inputSchema: {
        employeeId: z.string(),
        data: z.object({
          title: z.string().optional(),
          departmentId: z.string().optional(),
          division: z.string().optional(),
          organization: z.string().optional(),
          managerEmployeeId: z.string().optional()
        })
      }
    },
    async ({ employeeId, data }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Update employee
        const result = await apiClient.updateEmployee(employeeId, data);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              message: 'Employee updated successfully',
              employee: result
            }, null, 2) 
          }]
        };
      } catch (error: any) {
        console.error('Error in updateEmployee tool:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to update employee' 
            }, null, 2)
          }]
        };
      }
    }
  );

  /**
   * calculateTurnover tool - Calculate employee turnover rate for a specific period
   */
  server.registerTool(
    'calculateTurnover',
    {
      title: 'Calculate Turnover Rate',
      description: 'Calculate employee turnover rate and related metrics for a specific period (default: last 12 months).',
      inputSchema: {
        startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (default: 12 months ago)'),
        endDate: z.string().optional().describe('End date in YYYY-MM-DD format (default: today)')
      }
    },
    async ({ startDate, endDate }: { startDate?: string; endDate?: string }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);

        if(!startDate){
          
          var tempStartDate = new Date();
          tempStartDate.setFullYear(tempStartDate.getFullYear() - 1);
          startDate = tempStartDate.toISOString().split('T')[0];
        }
        if(!endDate){
          var tempEndDate = new Date();
          endDate = tempEndDate.toISOString().split('T')[0];
        }

        // Calculate turnover
        const result = await apiClient.calculateTurnover(startDate, endDate);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2) 
          }]
        };
      } catch (error: any) {
        console.error('Error in calculateTurnover tool:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to calculate turnover rate' 
            }, null, 2)
          }]
        };
      }
    }
  );
  
  /**
   * getOffboardings tool - Get list of offboarded employees with details
   */
  server.registerTool(
    'getOffboardings',
    {
      title: 'Get Offboardings',
      description: 'Get a list of offboarded employees with details, filterable by date range and type (voluntary/involuntary).',
      inputSchema: {
        startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
        offboardInvoluntary: z.boolean().optional().describe('Filter by involuntary (true) or voluntary (false)')
      }
    },
    async ({ startDate, endDate, offboardInvoluntary }: { startDate?: string; endDate?: string; offboardInvoluntary?: boolean }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        

        if(!startDate){
          
          var tempStartDate = new Date();
          tempStartDate.setMonth(tempStartDate.getMonth() - 3);
          startDate = tempStartDate.toISOString().split('T')[0];
        }
        if(!endDate){
          var tempEndDate = new Date();
          tempEndDate.setMonth(tempEndDate.getMonth() + 6);
          endDate = tempEndDate.toISOString().split('T')[0];
        }
        // Get offboardings with filters
        const filters: OffboardingFilters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (offboardInvoluntary !== undefined) filters.offboardInvoluntary = offboardInvoluntary;
        


        const result = await apiClient.getOffboardings(filters);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2) 
          }]
        };
      } catch (error: any) {
        console.error('Error in getOffboardings tool:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to fetch offboardings' 
            }, null, 2)
          }]
        };
      }
    }
  );

  /**
   * getEmployeeCountByDivision tool - Returns the count of active employees grouped by division
   */
  server.registerTool(
    'getEmployeeCountByDivision',
    {
      title: 'Get Employee Count By Division',
      description: 'Returns the count of active employees grouped by division.',
      inputSchema: {
        onlyActive: z.boolean().optional().default(true),
      }
    },
    async ({ onlyActive }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call to get all employees
        const filters = onlyActive ? { active: true } : {};
        const limit = 1000; // Set a higher limit to ensure we get all employees
        const result = await apiClient.getAllEmployees(limit, filters as EmployeeFilters);
        
        // Group employees by division
        const divisionCounts: Record<string, CountResult> = {};
        const divisionEmployees: Record<string, Array<any>> = {};
        
        result.employees.forEach(employee => {
          const division = employee.division || 'Unassigned';
          
          if (!divisionCounts[division]) {
            divisionCounts[division] = {
              id: division,
              name: division,
              count: 0
            };
            divisionEmployees[division] = [];
          }
          divisionCounts[division].count++;
          divisionEmployees[division].push(employee);
        });
        
        // Calculate demographic sub-counts for each division
        Object.keys(divisionCounts).forEach(division => {
          divisionCounts[division].demographics = calculateDemographicCounts(divisionEmployees[division]);
        });
        
        // Convert to array and sort by count (descending)
        const countArray = Object.values(divisionCounts).sort((a, b) => b.count - a.count);
        
        const responseData = {
          counts: countArray,
          totalCount: result.employees.length,
          filter: onlyActive ? 'active employees only' : 'all employees'
        };

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(responseData, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error fetching employee counts by division:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to fetch employee counts by division' 
            }, null, 2)
          }]
        };
      }
    }
  );
};


