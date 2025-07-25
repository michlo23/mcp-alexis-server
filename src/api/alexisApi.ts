import axios from 'axios';
import { ALEXIS_EMPLOYEE_API_URL, ALEXIS_DEPARTMENT_API_URL, ALEXIS_LEAVE_API_URL, ALEXIS_OFFICE_API_URL, ALEXIS_API_BASE_URL, ALEXIS_GRAPHQL_API_URL } from '../config';

// Define the leave-type API URL
const ALEXIS_LEAVE_TYPE_API_URL = `${ALEXIS_API_BASE_URL}/leave-type`;
const ALEXIS_OFFBOARDING_TYPE_API_URL = `${ALEXIS_API_BASE_URL}/offboarding-type`;

import { Employee, Department, Office, Leave, Offboarding } from '../types/alexis';

// Extended interfaces to handle property differences between API responses
interface ExtendedEmployee extends Partial<Employee> {
  _id?: string;
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  startDate?: string;
  endDate?: string;
  birthDate?: string;
  hireDate?: string;
  gender?: string;
  departmentId?: string;
  officeId?: string;
  managerEmployeeId?: string;
  Department?: string | null;
  Office?: string | null;
  managerName?: string | null;
  division?: string;
}

interface SimplifiedDepartment {
  _id?: string;
  id?: string;
  name: string;
  description?: string | null;
}

interface SimplifiedOffice {
  _id?: string;
  id?: string;
  name: string;
  country?: string | null;
  visitingAddress?: {
    country?: string | null;
  };
}

interface LeaveType {
  _id: string;
  id: string;
  name: string;
}

interface SimplifiedLeaveType {
  _id?: string;
  id?: string;
  name: string;
}

interface ExtendedLeave extends Partial<Leave> {
  _id?: string;
  id?: string;
  startDate: string;
  endDate: string;
  employeeId: string;
  status: string;
  typeId?: string;
  employee?: {
    firstName: string;
    lastName: string;
    fullName?: string;
  } | null;
  leaveType?: {
    name: string;
  } | null;
}

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
    // Special handling for startDate and endDate to use $gte and $lte with date adjustments
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'startDate') {
        // Subtract one week from startDate
        const startDate = new Date(value);
        startDate.setDate(startDate.getDate() - 7); // Subtract 7 days
        params[`filters[${key}][$gte]`] = startDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else if (key === 'endDate') {
        // Add one week to endDate
        const endDate = new Date(value);
        endDate.setDate(endDate.getDate() + 7); // Add 7 days
        params[`filters[${key}][$lte]`] = endDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else {
        params[`filters[${key}][$eq]`] = value;
      }
    });
    
    return params;
  }

  /**
   * Decorates employee responses with Department and Office names
   * @param employees Array of employee objects or single employee object
   * @returns Employees with added Department and Office name fields
   */
  /**
   * Decorates employee responses with Department and Office names and manager name
   * @param employees Array of employee objects or single employee object
   * @param allEmployees Optional array of employees for manager name lookup
   * @returns Employees with added Department, Office and managerName fields
   */
  async decorateEmployeeResponse(employees: ExtendedEmployee[] | ExtendedEmployee, allEmployees: ExtendedEmployee[] = []): Promise<
    ExtendedEmployee[] | ExtendedEmployee
  > {
    try {
      // Fetch all departments and offices
      const departmentsResponse = await this.getAllDepartments();
      const officesResponse = await this.getAllOffices({});
      
      const departments: SimplifiedDepartment[] = departmentsResponse.departments;
      const offices: SimplifiedOffice[] = officesResponse.offices;
      
      // Create lookup maps for faster access by ID
      const departmentMap = new Map(departments.map(dept => [dept._id || dept.id, dept.name]));
      const officeMap = new Map(offices.map(office => [office._id || office.id, office.name]));
      
      // Create a map of employees for manager lookup
      const employeeMap = new Map();
      allEmployees.forEach(emp => {
        employeeMap.set(emp.id, { 
          firstName: emp.firstName, 
          lastName: emp.lastName 
        });
      });
      
      if (Array.isArray(employees)) {
        // Handle array of employees
        return employees.map(employee => {
          const manager = employee.managerEmployeeId ? employeeMap.get(employee.managerEmployeeId) : null;
          const managerName = manager ? `${manager.firstName} ${manager.lastName}` : null;
          
          return {
            ...employee,
            Department: employee.departmentId && departmentMap.get(employee.departmentId) || null,
            Office: employee.officeId && officeMap.get(employee.officeId) || null,
            managerName
          } as ExtendedEmployee;
        });
      } else {
        // Handle single employee
        const manager = employees.managerEmployeeId ? employeeMap.get(employees.managerEmployeeId) : null;
        const managerName = manager ? `${manager.firstName} ${manager.lastName}` : null;
        
        return {
          ...employees,
          Department: employees.departmentId && departmentMap.get(employees.departmentId) || null,
          Office: employees.officeId && officeMap.get(employees.officeId) || null,
          managerName
        } as ExtendedEmployee;
      }
    } catch (error: any) {
      console.error('Error decorating employee response:', error);
      throw error;
    }
  }

  /**
   * Get all employees with optional filtering and pagination
   */
  /**
   * Get all employees with optional filtering and pagination
   * @param limit Maximum number of employees to return per request
   * @param filters Optional filters for querying employees
   * @returns Object containing employees array and metadata
   */
  async getAllEmployees(limit: number = 500, filters?: Record<string, any>): Promise<{
    employees: ExtendedEmployee[];
    metadata: {
      count: number;
      totalAvailable: number;
      limit: number;
      appliedFilters: Record<string, any>;
    };
  }> {
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
            select: "id,firstName,lastName,workEmail,privateEmail,privatePhone,workPhone,title,active,division,organization,employeeNumber,nationality,departmentId,officeId,birthDate,gender,age,managerEmployeeId,hireDate",
            ...filterParams,
          },
        });

        const batch = response.data.data || [];
        total = response.data.total || 0;
        employees.push(...batch);

        offset += limit;
      } while (offset < total);

      // Decorate employees with Department and Office names
      const decoratedEmployees = await this.decorateEmployeeResponse(employees) as ExtendedEmployee[];

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
  /**
   * Get employee by ID
   * @param employeeId ID of the employee to fetch
   * @returns Employee object with Department and Office names
   */
  async getEmployeeById(employeeId: string): Promise<ExtendedEmployee> {
    try {
      const response = await axios.get(`${ALEXIS_EMPLOYEE_API_URL}/${employeeId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },
        params: {
          select: "id,firstName,lastName,workEmail,privateEmail,privatePhone,workPhone,title,active,division,organization,employeeNumber,nationality,departmentId,officeId,birthDate,gender,age,managerEmployeeId,hireDate",
        }
      });

      // Decorate employee with Department and Office names
      const decoratedEmployee = await this.decorateEmployeeResponse(response.data) as ExtendedEmployee;
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
  /**
   * Update an employee's information
   * @param employeeId ID of the employee to update
   * @param data Object containing fields to update
   * @returns Updated employee data with Department and Office names
   */
  async updateEmployee(employeeId: string, data: {
    title?: string;
    departmentId?: string;
    division?: string;
    organization?: string;
    managerEmployeeId?: string;
  }) {
    // Ensure only allowed fields are included
    const allowedFields = ['title', 'departmentId', 'division', 'organization', 'managerEmployeeId'];
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
      const decoratedEmployee = await this.decorateEmployeeResponse(response.data) as ExtendedEmployee;
      return decoratedEmployee;
    } catch (error) {
      console.error(`Error updating employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get all departments with optional filtering and pagination
   */
  /**
   * Get all departments with optional filtering and pagination
   * @param limit Maximum number of departments to return per request
   * @param filters Optional filters for querying departments
   * @param simplified Whether to return simplified department data (default: true)
   * @returns Object containing departments array and metadata
   */
  async getAllDepartments(limit: number = 500, filters?: Record<string, any>, simplified: boolean = true): Promise<{
    departments: SimplifiedDepartment[];
    metadata: {
      count: number;
      totalAvailable: number;
      limit: number;
      appliedFilters: Record<string, any>;
    };
  }> {
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
            ...filterParams,
          },
        });

        const batch = response.data.data || [];
        total = response.data.total || 0;
        departments.push(...batch);

        offset += limit;
      } while (offset < total);

      // Transform departments to simplified format if requested
      const transformedDepartments = simplified ? departments.map(dept => ({
        _id: dept._id,
        id: dept.id,
        name: dept.name,
        description: dept.description || null
      } as SimplifiedDepartment)) : departments;

      return {
        departments: transformedDepartments,
        metadata: {
          count: transformedDepartments.length,
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
  /**
   * Get department by ID
   * @param departmentId ID of the department to fetch
   * @param simplified Whether to return simplified department data (default: true)
   * @returns Department object
   */
  async getDepartmentById(departmentId: string, simplified: boolean = true): Promise<SimplifiedDepartment> {
    try {
      const response = await axios.get(`${ALEXIS_DEPARTMENT_API_URL}/${departmentId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        }
      });

      // Return simplified department data if requested
      if (simplified && response.data) {
        return {
          _id: response.data._id,
          id: response.data.id,
          name: response.data.name,
          description: response.data.description || null
        } as SimplifiedDepartment;
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching department ${departmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get all leaves with optional filtering and pagination
   */
  /**
   * Get all leaves with optional filtering and pagination
   * @param limit Maximum number of leaves to return per request
   * @param filters Optional filters for querying leaves
   * @returns Object containing leaves array and metadata
   */
  /**
   * Get all leave types
   * @param simplified Whether to return simplified leave type data (default: true)
   * @returns Object containing leave types array and metadata
   */
  async getAllLeaveTypes(simplified: boolean = true): Promise<{
    leaveTypes: SimplifiedLeaveType[];
    metadata: {
      count: number;
    };
  }> {
    try {
      const response = await axios.get(ALEXIS_LEAVE_TYPE_API_URL, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },params: {
          select: "name"
        },
      });

      const leaveTypes = response.data.data || [];
      
      // Transform leave types to simplified format if requested
      const transformedLeaveTypes = simplified ? leaveTypes.map((type: any) => ({
        _id: type._id,
        id: type.id,
        name: type.name,
      } as SimplifiedLeaveType)) : leaveTypes;

      return {
        leaveTypes: transformedLeaveTypes,
        metadata: {
          count: transformedLeaveTypes.length,
        }
      };
    } catch (error) {
      console.error('Error fetching leave types:', error);
      throw error;
    }
  }

  /**
   * Get a specific leave type by ID
   * @param typeId ID of the leave type to fetch
   * @param simplified Whether to return simplified leave type data (default: true)
   * @returns Leave type object
   */
  async getLeaveTypeById(typeId: string, simplified: boolean = true): Promise<SimplifiedLeaveType> {
    try {
      const response = await axios.get(`${ALEXIS_LEAVE_TYPE_API_URL}/${typeId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },
      });

      if (simplified && response.data) {
        return {
          _id: response.data._id,
          id: response.data.id,
          name: response.data.name,
        } as SimplifiedLeaveType;
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching leave type ${typeId}:`, error);
      throw error;
    }
  }

  /**
   * Decorates leave responses with employee and leave type information
   * @param leaves Array of leave objects or single leave object
   * @returns Leaves with added employee and leave type information
   */
  async decorateLeaveResponse(leaves: ExtendedLeave[] | ExtendedLeave): Promise<
    ExtendedLeave[] | ExtendedLeave
  > {
    try {
      // Fetch all employees and leave types in parallel
      const [employeesResponse, leaveTypesResponse] = await Promise.all([
        this.getAllEmployees(),
        this.getAllLeaveTypes()
      ]);
      
      const employees: ExtendedEmployee[] = employeesResponse.employees;
      const leaveTypes: SimplifiedLeaveType[] = leaveTypesResponse.leaveTypes;
      
      // Create a map of employees for faster lookup by ID
      const employeeMap = new Map();
      employees.forEach(emp => {
        employeeMap.set(emp.id, {
          firstName: emp.firstName,
          lastName: emp.lastName,
          fullName: `${emp.firstName} ${emp.lastName}`
        });
      });
      
      // Create a map of leave types for faster lookup by ID
      const leaveTypeMap = new Map();
      leaveTypes.forEach(type => {
        leaveTypeMap.set(type.id, {
          name: type.name
        });
      });
      
      if (Array.isArray(leaves)) {
        // Handle array of leaves
        return leaves.map(leave => {
          const employeeInfo = leave.employeeId ? employeeMap.get(leave.employeeId) : null;
          const leaveTypeInfo = leave.typeId ? leaveTypeMap.get(leave.typeId) : null;
          
          return {
            ...leave,
            employee: employeeInfo || null,
            leaveType: leaveTypeInfo || null
          } as ExtendedLeave;
        });
      } else {
        // Handle single leave
        const employeeInfo = leaves.employeeId ? employeeMap.get(leaves.employeeId) : null;
        const leaveTypeInfo = leaves.typeId ? leaveTypeMap.get(leaves.typeId) : null;
        
        return {
          ...leaves,
          employee: employeeInfo || null,
          leaveType: leaveTypeInfo || null
        } as ExtendedLeave;
      }
    } catch (error: any) {
      console.error('Error decorating leave response:', error);
      throw error;
    }
  }

  async getAllLeaves(limit: number = 500, filters?: Record<string, any>): Promise<{
    leaves: ExtendedLeave[];
    metadata: {
      count: number;
      totalAvailable: number;
      limit: number;
      appliedFilters: Record<string, any>;
    };
  }> {
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
            select: "startDate,endDate,employeeId,status,typeId",
            ...filterParams,
          },
        });

        const batch = response.data.data || [];
        total = response.data.total || 0;
        leaves.push(...batch);

        offset += limit;
      } while (offset < total);

      // Decorate leaves with employee information
      const decoratedLeaves = await this.decorateLeaveResponse(leaves) as ExtendedLeave[];
      
      return {
        leaves: decoratedLeaves,
        metadata: {
          count: decoratedLeaves.length,
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
  /**
   * Get leave by ID
   * @param leaveId ID of the leave to fetch
   * @returns Leave object
   */
  async getLeaveById(leaveId: string): Promise<ExtendedLeave> {
    try {
      const response = await axios.get(`${ALEXIS_LEAVE_API_URL}/${leaveId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },
        params: {
             select: "startDate,endDate,employeeId,status,typeId",
        }
      });

      // Decorate leave with employee information
      const decoratedLeave = await this.decorateLeaveResponse(response.data) as ExtendedLeave;
      return decoratedLeave;
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
  /**
   * Get all offices with optional filtering, sorting and pagination
   * @param options Object containing parameters
   * @returns Object containing offices array and metadata
   */
  async getAllOffices({
    limit = 500,
    filters,
    offset = 0,
    sort,
    simplified = true
  }: {
    limit?: number;
    filters?: Record<string, any>;
    select?: string;
    offset?: number;
    sort?: string;
    simplified?: boolean;
  } = {}): Promise<{
    offices: SimplifiedOffice[];
    metadata: {
      count: number;
      totalAvailable: number;
      limit: number;
      offset: number;
      appliedFilters: Record<string, any>;
    };
  }> {
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
            sort,
            ...filterParams,
          },
        });

        const batch = response.data.data || [];
        total = response.data.total || 0;
        offices.push(...batch);

        currentOffset += limit;
      } while (currentOffset < total);
      
      // Transform offices to simplified format if requested
      const transformedOffices = simplified ? offices.map(office => ({
        _id: office._id,
        id: office.id,
        name: office.name,
        country: office.visitingAddress?.country || null
      } as SimplifiedOffice)) : offices;

      return {
        offices: transformedOffices,
        metadata: {
          count: transformedOffices.length,
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
  /**
   * Get office by ID
   * @param officeId ID of the office to fetch
   * @param select Optional fields to select
   * @param simplified Whether to return simplified office data (default: true)
   * @returns Office object
   */
  async getOfficeById(officeId: string, select = "id,name,location,address,city,country,postalCode", simplified = true): Promise<SimplifiedOffice> {
    try {
      const response = await axios.get(`${ALEXIS_OFFICE_API_URL}/${officeId}`, {
        headers: {
          Authorization: `${this.jwtToken}`,
        },
      });
      

      if (simplified && response.data) {
        return {
          _id: response.data._id,
          id: response.data.id,
          name: response.data.name,
          country: response.data.visitingAddress?.country || null
        } as SimplifiedOffice;
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching office ${officeId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a GraphQL query with proper error handling and retries
   * @param query The GraphQL query string
   * @param variables Variables for the GraphQL query
   * @param version API version to use ('v2' or empty string for default)
   * @param silent Whether to suppress error logging
   * @param options Additional options like retries and timeout
   * @returns The data from the GraphQL response
   */
  async executeGraphQL(query: string, variables: any = {}, version = 'v2', silent = false, options: any = {}) {
    try {
      const {
        retries = 3,
        timeout = 30000
      } = options;

      // Determine the GraphQL endpoint
      const graphqlEndpoint = version === 'v2' ? '/v2/graphql' : '/graphql';
      const graphqlUrl = ALEXIS_GRAPHQL_API_URL || 'https://api.alexishr.com/v2/graphql';
      
      // Create a separate axios instance for GraphQL
      const graphqlClient = axios.create();
        
      // Configure logging label
      const serviceName = silent ? 'GraphQL (silent)' : `GraphQL ${graphqlEndpoint}`;
      
      const response = await graphqlClient.post(
        graphqlUrl,
        {
          query,
          variables
        },
        {
          headers: {
            'Authorization': this.jwtToken,
            'Content-Type': 'application/json'
          }
        }
      );

      // Check for errors in the response
      if (response.data.errors) {
        // If we have data alongside errors, log the errors as warnings but return the data
        if (response.data.data) {
          if (!silent) {
            console.warn('GraphQL partial errors (returning available data):', {
              errors: response.data.errors,
              errorCount: response.data.errors.length,
              query: query.split('\n')[0].trim() // First line of query for context
            });
          }
          return response.data.data;
        } else {
          // If we have errors but no data, throw the error
          throw new Error(response.data.errors[0].message);
        }
      }

      return response.data.data;
    } catch (error) {
      if (!silent) {
        console.error('GraphQL execution error:', error);
      }
      throw error;
    }
  }

  /**
   * Get raw offboarding data via GraphQL
   * @returns List of offboarding records, deduplicated by employeeId (keeping newest by created date)
   */
  async getOffboardingList(): Promise<Offboarding[]> {
    try {
      const query = `
        query Data {
          offboardingList {
            data {
              id
              employeeId
              offboardDate
              offboardComment
              offboardInvoluntary
              endDate
              created
            }
          }
        }
      `;

      const result = await this.executeGraphQL(query, {}, 'v2');
      
      if (!result?.offboardingList?.data) {
        console.error('Invalid response format for offboardings');
        return [];
      }

      const allOffboardings = result.offboardingList.data;
      
      // Deduplicate records by employeeId, keeping only the newest record by created date
      const employeeMap = new Map();
      
      // Group records by employeeId
      allOffboardings.forEach((record: Offboarding) => {
        if (!record.employeeId) {
          return; // Skip records without employeeId
        }
        
        // If we don't have this employee yet, or this record is newer than what we have
        if (!employeeMap.has(record.employeeId) || 
            new Date(record.created) > new Date(employeeMap.get(record.employeeId).created)) {
          employeeMap.set(record.employeeId, record);
        }
      });
      
      // Get unique records (newest per employee)
      const uniqueOffboardings = Array.from(employeeMap.values());
      
      return uniqueOffboardings;
    } catch (error) {
      console.error('Error fetching offboarding data:', error);
      throw error;
    }
  }

  /**
   * Get offboardings with employee details
   * @param filters Optional filters for offboarding data
   * @returns List of offboarded employees with details
   */
  async getOffboardings(filters: Record<string, any> = {}): Promise<Offboarding[]> {
    try {
      // Get raw offboarding data
      const offboardings = await this.getOffboardingList();
      
      // Get all employees for joining
      const { employees } = await this.getAllEmployees(1000, { active: false });
      
      // Join employee details with offboarding data
      let result = offboardings.map(offboarding => {
        const employee = employees.find(e => e.id === offboarding.employeeId);
        
        if (!employee) {
          return null;
        }
        
        return {
          ...offboarding,
          employee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            birthDate: employee.birthDate,
            hireDate: employee.hireDate,
            active: employee.active,
            gender: employee.gender,
            division: employee.division,
            department: employee.Department,
            office: employee.Office,
          }
        };
      }).filter(item => item !== null) as Offboarding[];
      
      // Apply filters if any
      if (filters) {
        
        // Date range filters
        if (filters.startDate) {
          const beforeCount = result.length;
          result = result.filter(item => 
            new Date(item.offboardDate) >= new Date(filters.startDate)
          );
        }
        
        if (filters.endDate) {
          const beforeCount = result.length;
          result = result.filter(item => 
            new Date(item.offboardDate) <= new Date(filters.endDate)
          );
        }
        
        // Voluntary/involuntary filter
        if (filters.offboardInvoluntary !== undefined) {
          const beforeCount = result.length;
          result = result.filter(item =>
            item.offboardInvoluntary === filters.offboardInvoluntary
          );
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching offboardings:', error);
      throw error;
    }
  }

  /**
   * Calculate turnover rate for a specific period with monthly breakdown
   * @param startDate Optional start date (default: 12 months ago)
   * @param endDate Optional end date (default: today)
   * @returns Turnover metrics with monthly breakdown
   */
  async calculateTurnover(startDate?: string, endDate?: string): Promise<{
    period: { start: string; end: string };
    metrics: {
      overallRate: number;
      voluntaryRate: number;
      involuntaryRate: number;
      totalEmployees: number;
      totalOffboarded: number;
      voluntaryOffboarded: number;
      involuntaryOffboarded: number;
      totalEnded: number;
      voluntaryEnded: number;
      involuntaryEnded: number;
    };
    monthlyMetrics: Array<{
      month: string;
      totalEmployeesStart: number;
      totalOffboarded: number;
      voluntaryOffboarded: number;
      involuntaryOffboarded: number;
      totalEnded: number;
      voluntaryEnded: number;
      involuntaryEnded: number;
      turnoverRate: number;
      endedRate: number;
    }>;
  }> {
    try {
      // Default period: last 12 months
      const today = new Date();
      const end = endDate ? new Date(endDate) : today;
      const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(today.getFullYear() - 1));
      
      // Format dates for filtering and response
      const startFormatted = start.toISOString().split('T')[0];
      const endFormatted = end.toISOString().split('T')[0];
      
      // Get all employees and filter active status in the filter logic
      const allEmployeesResponse = await this.getAllEmployees(10000, {});
      const allEmployees = allEmployeesResponse.employees;
      
      // Get offboardings for the period
      const offboardings = await this.getOffboardings({
        startDate: startFormatted,
        endDate: endFormatted
      });
      
      // Create a map of employeeId to offboarding record for easy lookup
      const offboardingMap = new Map();
      offboardings.forEach(o => {
        if (o.employeeId) {
          offboardingMap.set(o.employeeId, o);
        }
      });
      
      // Helper function to get the end date from offboarding record if available
      const getEmployeeEndDate = (employee: ExtendedEmployee): Date | null => {
        // Try to get endDate from offboarding record first
        
        const offboardRecord = offboardingMap.get(employee.id);
        if (offboardRecord && offboardRecord.endDate) {
          return new Date(offboardRecord.endDate);
        }
        // Fall back to employee's endDate if no offboarding record found
        if (employee.endDate) {
          return new Date(employee.endDate);
        }
        return null;
      };
      
      
      // Calculate month range
      const months: string[] = [];
      const currentDate = new Date(start);
      while (currentDate <= end) {
        months.push(currentDate.toISOString().substring(0, 7)); // YYYY-MM format
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      // Calculate metrics for each month
      const monthlyMetrics = [];
      
      for (const monthKey of months) {
        console.log("Month key: ", monthKey);
        // Define month start and end dates
        const monthStart = new Date(`${monthKey}-01T00:00:00Z`);
        const monthEnd = new Date(new Date(monthStart).setMonth(monthStart.getMonth() + 1));
        monthEnd.setDate(monthEnd.getDate() - 1); // Last day of month
        
        // Count employees at start of month (active on first day of month)
        const employeesAtMonthStart = allEmployees.filter(employee => {
          // Employee must be active
          // AND either no end date or end date after month start
          // Get employee's end date from offboarding record or employee data
          const endDate = getEmployeeEndDate(employee);
          // Get employee's hire date 
          const hireDate = employee.hireDate ? new Date(employee.hireDate) : null;
          
          // An employee should be counted if they were employed at the start of the month:
          // 1. Active employees: must have been hired on or before month start AND not ended yet or ended after month start
          // 2. Inactive employees: must have end date after month start (meaning they were still active at month start)
          
          const isActiveAtMonthStart = 
            // Case 1: Currently active employee
            (employee.active === true && 
              // Either has no end date or ended after month start
              (!endDate || endDate >= monthStart) &&
              // AND was hired before or exactly on month start
              (hireDate && hireDate <= monthStart)
            ) || 
            // Case 2: Inactive employee who was active at month start
            (employee.active === false && 
              // Must have end date after month start
              endDate && endDate >= monthStart &&
              // AND was hired before or exactly on month start
              (hireDate && hireDate <= monthStart)
            );

          
          return isActiveAtMonthStart;
        });
        
        // Count offboardings during this month
        const monthOffboardings = offboardings.filter(o => {
          const offboardDate = o.offboardDate ? new Date(o.offboardDate) : (o.endDate ? new Date(o.endDate) : null);
          return offboardDate && 
                 offboardDate >= monthStart && 
                 offboardDate <= monthEnd;
        });
        
        // Count ended employees (by endDate from offboarding records) during this month
        const monthEnded = offboardings.filter(o => {
          if (!o.endDate) return false;
          const endDate = new Date(o.endDate);
          return endDate >= monthStart && endDate <= monthEnd;
        });
        
        // Track voluntary vs involuntary ended employees
        const monthVoluntaryEnded = monthEnded.filter(o => !o.offboardInvoluntary);
        const monthInvoluntaryEnded = monthEnded.filter(o => o.offboardInvoluntary);
        
        const monthTotalOffboarded = monthOffboardings.length;
        const monthVoluntaryOffboarded = monthOffboardings.filter(o => !o.offboardInvoluntary).length;
        const monthInvoluntaryOffboarded = monthOffboardings.filter(o => o.offboardInvoluntary).length;
        const monthTotalEnded = monthEnded.length;
        const monthVoluntaryEndedCount = monthVoluntaryEnded.length;
        const monthInvoluntaryEndedCount = monthInvoluntaryEnded.length;
        
        // Calculate turnover rate using month start headcount
        const totalEmployeesStart = employeesAtMonthStart.length;
        const turnoverRate = totalEmployeesStart > 0 ? 
                           (monthTotalOffboarded / totalEmployeesStart) * 100 : 0;
        const endedRate = totalEmployeesStart > 0 ? 
                           (monthTotalEnded / totalEmployeesStart) * 100 : 0;
        
        monthlyMetrics.push({
          month: monthKey,
          totalEmployeesStart,
          totalOffboarded: monthTotalOffboarded,
          voluntaryOffboarded: monthVoluntaryOffboarded,
          involuntaryOffboarded: monthInvoluntaryOffboarded,
          totalEnded: monthTotalEnded,
          voluntaryEnded: monthVoluntaryEndedCount,
          involuntaryEnded: monthInvoluntaryEndedCount,
          turnoverRate: parseFloat(turnoverRate.toFixed(2)),
          endedRate: parseFloat(endedRate.toFixed(2))
        });
      }
      
      
      // Calculate average headcount across the period for overall metrics
      // We use the first day of each month in the period
      const averageHeadcount = monthlyMetrics.reduce((sum, month) => sum + month.totalEmployeesStart, 0) / monthlyMetrics.length;
      
      // Count offboarded employees by type for the whole period
      const totalOffboarded = offboardings.length;
      const voluntaryOffboarded = offboardings.filter(o => !o.offboardInvoluntary).length;
      const involuntaryOffboarded = offboardings.filter(o => o.offboardInvoluntary).length;
      
      // Count employees who ended employment in the period (by endDate from offboarding records)
      const endedEmployees = offboardings.filter(o => {
        if (!o.endDate) return false;
        const endDate = new Date(o.endDate);
        return endDate >= start && endDate <= end;
      });
      const totalEnded = endedEmployees.length;
      
      // Count voluntary vs involuntary ended employees
      const voluntaryEnded = endedEmployees.filter(o => !o.offboardInvoluntary).length;
      const involuntaryEnded = endedEmployees.filter(o => o.offboardInvoluntary).length;
      
      // Calculate overall rates using average headcount
      const overallRate = averageHeadcount > 0 ? (totalOffboarded / averageHeadcount) * 100 : 0;
      const voluntaryRate = averageHeadcount > 0 ? (voluntaryOffboarded / averageHeadcount) * 100 : 0;
      const involuntaryRate = averageHeadcount > 0 ? (involuntaryOffboarded / averageHeadcount) * 100 : 0;
      
      return {
        period: {
          start: startFormatted,
          end: endFormatted
        },
        metrics: {
          overallRate: parseFloat(overallRate.toFixed(2)),
          voluntaryRate: parseFloat(voluntaryRate.toFixed(2)),
          involuntaryRate: parseFloat(involuntaryRate.toFixed(2)),
          totalEmployees: Math.round(averageHeadcount),
          totalOffboarded,
          voluntaryOffboarded,
          involuntaryOffboarded,
          totalEnded,
          voluntaryEnded,
          involuntaryEnded
        },
        monthlyMetrics
      };
    } catch (error) {
      console.error('Error calculating turnover rate:', error);
      throw error;
    }
  }
}
