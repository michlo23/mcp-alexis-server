import { Employee } from '../types/alexis';

// Interface for demographic counts
export interface DemographicCounts {
  nationality: Record<string, number>;
  gender: Record<string, number>;
  ageGroups: {
    '18-29': number;
    '30-39': number;
    '40-49': number;
    '50-59': number;
    '60-99': number;
    'unknown': number;
  };
}

/**
 * Calculate demographic sub-counts from a list of employees
 * @param employees Array of employee objects
 * @returns Object with demographic counts (nationality, gender, age groups)
 */
export function calculateDemographicCounts(employees: Employee[]): DemographicCounts {
  // Initialize counts
  const nationalityCounts: Record<string, number> = {};
  const genderCounts: Record<string, number> = {};
  const ageGroups = {
    '18-29': 0,
    '30-39': 0,
    '40-49': 0,
    '50-59': 0,
    '60-99': 0,
    'unknown': 0
  };
  
  // Process each employee
  employees.forEach(employee => {
    // Count by nationality
    const nationality = employee.nationality || 'unknown';
    if (!nationalityCounts[nationality]) {
      nationalityCounts[nationality] = 0;
    }
    nationalityCounts[nationality]++;
    
    // Count by gender
    const gender = employee.gender || 'unknown';
    if (!genderCounts[gender]) {
      genderCounts[gender] = 0;
    }
    genderCounts[gender]++;
    
    // Count by age group
    let ageGroup: '18-29' | '30-39' | '40-49' | '50-59' | '60-99' | 'unknown' = 'unknown';
    if (employee.age) {
      const age = parseInt(employee.age as string, 10);
      if (!isNaN(age)) {
        if (age >= 18 && age <= 29) ageGroup = '18-29';
        else if (age >= 30 && age <= 39) ageGroup = '30-39';
        else if (age >= 40 && age <= 49) ageGroup = '40-49';
        else if (age >= 50 && age <= 59) ageGroup = '50-59';
        else if (age >= 60 && age <= 99) ageGroup = '60-99';
      }
    } else if (employee.birthDate) {
      // Calculate age from birthDate if age is not available
      const birthDate = new Date(employee.birthDate as string);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear() -
                  (today.getMonth() < birthDate.getMonth() || 
                  (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
                  
        if (age >= 18 && age <= 29) ageGroup = '18-29';
        else if (age >= 30 && age <= 39) ageGroup = '30-39';
        else if (age >= 40 && age <= 49) ageGroup = '40-49';
        else if (age >= 50 && age <= 59) ageGroup = '50-59';
        else if (age >= 60 && age <= 99) ageGroup = '60-99';
      }
    }
    
    ageGroups[ageGroup]++;
  });
  
  return {
    nationality: nationalityCounts,
    gender: genderCounts,
    ageGroups: ageGroups
  };
}
