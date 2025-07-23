import axios from 'axios';
import { ALEXIS_EMPLOYEE_API_URL, ALEXIS_DEPARTMENT_API_URL, ALEXIS_LEAVE_API_URL, ALEXIS_OFFICE_API_URL } from '../config';
import { Employee, Department, Office } from '../types/alexis';

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
   * Decorates employee responses with Department and Office names
   * @param employees Array of employee objects or single employee object
   * @returns Employees with added Department and Office name fields
   */
  async decorateEmployeeResponse(employees: Employee[] | Employee): Promise<
    Array<Employee & { Department: string | null, Office: string | null }> | 
    (Employee & { Department: string | null, Office: string | null })
  > {
    try {
      // Fetch all departments and offices
      const departmentsResponse = await this.getAllDepartments();
      const officesResponse = await this.getAllOffices({});
      
      const departments: Department[] = departmentsResponse.departments;
      const offices: Office[] = officesResponse.offices;
      
      // Create lookup maps for faster access by ID
      const departmentMap = new Map(departments.map(dept => [dept.id, dept.name]));
      const officeMap = new Map(offices.map(office => [office.id, office.name]));
      
      if (Array.isArray(employees)) {
        // Handle array of employees
        return employees.map(employee => ({
          ...employee,
          Department: employee.departmentId && departmentMap.get(employee.departmentId) || null,
          Office: employee.officeId && officeMap.get(employee.officeId) || null
        }));
      } else {
        // Handle single employee
        return {
          ...employees,
          Department: employees.departmentId && departmentMap.get(employees.departmentId) || null,
          Office: employees.officeId && officeMap.get(employees.officeId) || null
        };
      }
    } catch (error) {
      console.error('Error decorating employee response:', error);
      throw error;
    }
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

      // Decorate employees with Department and Office names
      // const decoratedEmployees = await this.decorateEmployeeResponse(employees);

      const decoratedEmployees = employees;

      return {
        employees: decoratedEmployees,
        metadata: {
          count: Array.isArray(decoratedEmployees) ? decoratedEmployees.length : 1,
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

      // Decorate employee with Department and Office names
      const decoratedEmployee = await this.decorateEmployeeResponse(response.data);
      return decoratedEmployee;
    } catch (error) {
      console.error(`Error fetching employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Update an employee's information
   * @param employeeId ID of the employee to update
   * @param data Object containing fields to update (only title, departmentId, division, organization allowed)
   * @returns Updated employee data with Department and Office names
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

      // Decorate the updated employee with Department and Office names
      const decoratedEmployee = await this.decorateEmployeeResponse(response.data);
      return decoratedEmployee;
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

  /**
   * Get all offices with optional filtering, sorting and pagination
   * @param limit Maximum number of offices to return per request
   * @param filters Optional filters for querying offices
   * @param select Optional fields to select
   * @param offset Offset for pagination
   * @param sort Optional sort parameter
   */
  async getAllOffices({
    limit = 500,
    filters,
   // select = "id,name,location,address,city,country,postalCode",
    offset = 0,
    sort
  }: {
    limit?: number;
    filters?: Record<string, any>;
    select?: string;
    offset?: number;
    sort?: string;
  } = {}) {
    const offices = [];
    let total = 0;
    let currentOffset = offset;
    
    // Build filter parameters
    const filterParams = this.buildFilterParams(filters);
    
    try {
      // Handle pagination by making multiple requests if needed
      do {
        const response = await axios.get(ALEXIS_OFFICE_API_URL, {
          headers: {
            Authorization: `${this.jwtToken}`,
          },
          params: {
            limit,
            offset: currentOffset,
        //    select,
            sort,
            ...filterParams,
          },
        });

        const batch = response.data.data || [];
        total = response.data.total || 0;
        offices.push(...batch);

        currentOffset += limit;
      } while (currentOffset < total);

      return {
        offices,
        metadata: {
          count: offices.length,
          totalAvailable: total,
          limit,
          offset,
          appliedFilters: filters || {}
        }
      };
    } catch (error) {
      console.error('Error fetching offices:', error);
      throw error;
    }
  }

  /**
   * Get office by ID
   * @param officeId ID of the office to fetch
   * @param select Optional fields to select
   */
  async getOfficeById(officeId: string, select = "id,name,location,address,city,country,postalCode") {
    try {
      const response = await axios.get(`${ALEXIS_OFFICE_API_URL}/${officeId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },
        // params: {
        //   select
        // }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching office ${officeId}:`, error);
      throw error;
    }
  }
}
