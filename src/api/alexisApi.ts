import axios from 'axios';
import { ALEXIS_EMPLOYEE_API_URL, ALEXIS_DEPARTMENT_API_URL, ALEXIS_LEAVE_API_URL } from '../config';

/**
 * Base API client for AlexisHR
 */
export class AlexisApiClient {
  private jwtToken: string;

  constructor(jwtToken: string) {
    this.jwtToken = jwtToken;
  }

  

  /**
   * Builds filter parameters for AlexisHR API
   * @param filters Object containing filter criteria
   * @returns URL parameters object for axios
   */
  private buildFilterParams(filters?: Record<string, any>) {
    if (!filters) return {};
    
    const params: Record<string, any> = {};
    
    // Convert filters object to AlexisHR API filter format
    // Example: { active: true } becomes { 'filters[active][$eq]': true }
    Object.entries(filters).forEach(([key, value]) => {
      params[`filters[${key}][$eq]`] = value;
    });
    
    return params;
  }

  /**
   * Get all employees with optional filtering and pagination
   */
  async getAllEmployees(limit: number = 500, filters?: Record<string, any>) {
    const employees = [];
    let offset = 0;
    let total = 0;
    
    // Build filter parameters
    const filterParams = this.buildFilterParams(filters);
    
    try {
      // Handle pagination by making multiple requests if needed
      do {
        const response = await axios.get(ALEXIS_EMPLOYEE_API_URL, {
          headers: {
            Authorization: `${this.jwtToken}`,
          },
          params: {
            limit,
            offset,
            select: "id,firstName,lastName,workEmail,privateEmail,privatePhone,workPhone,title,active,division,organization,employeeNumber,nationality,departmentId,officeId",
            ...filterParams,
          },
        });

        const batch = response.data.data || [];
        total = response.data.total || 0;
        employees.push(...batch);

        offset += limit;
      } while (offset < total);

      return {
        employees,
        metadata: {
          count: employees.length,
          totalAvailable: total,
          limit,
          appliedFilters: filters || {}
        }
      };
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(employeeId: string) {
    try {
      const response = await axios.get(`${ALEXIS_EMPLOYEE_API_URL}/${employeeId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },
        params: {
          select: "id,firstName,lastName,workEmail,privateEmail,privatePhone,workPhone,title,active,division,organization,employeeNumber,nationality,departmentId,officeId"
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Update an employee's information
   * @param employeeId ID of the employee to update
   * @param data Object containing fields to update (only title, departmentId, division, organization allowed)
   */
  async updateEmployee(employeeId: string, data: {
    title?: string;
    departmentId?: string;
    division?: string;
    organization?: string;
  }) {
    // Ensure only allowed fields are included
    const allowedFields = ['title', 'departmentId', 'division', 'organization'];
    const updateData: Record<string, any> = {};
    
    // Only include allowed fields that are present in the input data
    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key) && data[key as keyof typeof data] !== undefined) {
        updateData[key] = data[key as keyof typeof data];
      }
    });
    
    try {
      const response = await axios.patch(`${ALEXIS_EMPLOYEE_API_URL}/${employeeId}`, updateData, {
        headers: {
          'Authorization': `${this.jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error updating employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get all departments with optional filtering and pagination
   */
  async getAllDepartments(limit: number = 500, filters?: Record<string, any>) {
    const departments = [];
    let offset = 0;
    let total = 0;
    
    // Build filter parameters
    const filterParams = this.buildFilterParams(filters);
    
    try {
      // Handle pagination by making multiple requests if needed
      do {
        const response = await axios.get(ALEXIS_DEPARTMENT_API_URL, {
          headers: {
            Authorization: `${this.jwtToken}`,
          },
          params: {
            limit,
            offset,
            select: "id,companyId,name,costCenterId,effectiveCostCenterId,parentId",
            ...filterParams,
          },
        });

        const batch = response.data.data || [];
        total = response.data.total || 0;
        departments.push(...batch);

        offset += limit;
      } while (offset < total);

      return {
        departments,
        metadata: {
          count: departments.length,
          totalAvailable: total,
          limit,
          appliedFilters: filters || {}
        }
      };
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(departmentId: string) {
    try {
      const response = await axios.get(`${ALEXIS_DEPARTMENT_API_URL}/${departmentId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },
        params: {
          select: "id,companyId,name,costCenterId,effectiveCostCenterId,parentId"
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching department ${departmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get all leaves with optional filtering and pagination
   */
  async getAllLeaves(limit: number = 500, filters?: Record<string, any>) {
    const leaves = [];
    let offset = 0;
    let total = 0;
    
    // Build filter parameters
    const filterParams = this.buildFilterParams(filters);
    
    try {
      // Handle pagination by making multiple requests if needed
      do {
        const response = await axios.get(ALEXIS_LEAVE_API_URL, {
          headers: {
            Authorization: `${this.jwtToken}`,
          },
          params: {
            limit,
            offset,
           // select: "id,employeeId,typeId,status,duration,startDate,endDate,gradePercentage",
            relations:"type,employee",
            ...filterParams,
          },
        });

        const batch = response.data.data || [];
        total = response.data.total || 0;
        leaves.push(...batch);

        offset += limit;
      } while (offset < total);

      return {
        leaves,
        metadata: {
          count: leaves.length,
          totalAvailable: total,
          limit,
          appliedFilters: filters || {}
        }
      };
    } catch (error) {
      console.error('Error fetching leaves:', error);
      throw error;
    }
  }

  /**
   * Get leave by ID
   */
  async getLeaveById(leaveId: string) {
    try {
      const response = await axios.get(`${ALEXIS_LEAVE_API_URL}/${leaveId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },
        params: {
              // select: "id,employeeId,typeId,status,duration,startDate,endDate,gradePercentage",
              relations:"type,employee",
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching leave ${leaveId}:`, error);
      throw error;
    }
  }
}
