// Type definitions for AlexisHR entities and API responses

// Employee types
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  privateEmail: string;
  privatePhone: string;
  workPhone: string;
  title: string;
  active: boolean;
  division: string;
  organization: string;
  employeeNumber: string;
  nationality: string;
  departmentId: string;
  officeId: string;
  gender?: string;
  birthDate?: string;
  age?: string | number;
}

export interface EmployeeFilters {
  active?: boolean;
  title?: string;
  division?: string;
  organization?: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
}

export interface EmployeeResponse {
  employees: Employee[];
  metadata: {
    count: number;
    totalAvailable: number;
    limit: number;
    appliedFilters: Record<string, any>;
  };
}

// Department types
export interface Department {
  id: string;
  companyId: string;
  name: string;
  costCenterId: string;
  effectiveCostCenterId: string;
  parentId: string;
}

export interface DepartmentFilters {
  name?: string;
  companyId?: string;
  costCenterId?: string;
  effectiveCostCenterId?: string;
  parentId?: string;
}

export interface DepartmentResponse {
  departments: Department[];
  metadata: {
    count: number;
    totalAvailable: number;
    limit: number;
    appliedFilters: Record<string, any>;
  };
}

// Office types
export interface Office {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface OfficeResponse {
  offices: Office[];
  metadata: {
    count: number;
    totalAvailable: number;
    limit: number;
    offset: number;
    appliedFilters: Record<string, any>;
  };
}

// Leave types
export interface Leave {
  id: string;
  employeeId: string;
  typeId: string;
  status: string;
  duration: string;
  startDate: string;
  endDate: string;
  gradePercentage: string;
}

export interface LeaveFilters {
  employeeId?: string;
  typeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  gradePercentage?: string;
}

export interface LeaveResponse {
  leaves: Leave[];
  metadata: {
    count: number;
    totalAvailable: number;
    limit: number;
    appliedFilters: Record<string, any>;
  };
}
