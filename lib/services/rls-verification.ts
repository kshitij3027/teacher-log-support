/**
 * RLS Verification Service
 * 
 * This service verifies that Row Level Security policies are working correctly
 * by checking the database schema and policy configurations.
 */

export interface RLSPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

export interface RLSTable {
  schemaname: string;
  tablename: string;
  rowsecurity: boolean;
}

export class RLSVerificationService {
  /**
   * Verify that RLS is enabled on specified tables
   */
  static verifyRLSEnabled(tables: RLSTable[], expectedTables: string[]): boolean {
    const enabledTables = tables
      .filter(table => table.rowsecurity)
      .map(table => table.tablename);
    
    return expectedTables.every(tableName => enabledTables.includes(tableName));
  }

  /**
   * Verify that required policies exist for a table
   */
  static verifyTablePolicies(
    policies: RLSPolicy[], 
    tableName: string, 
    expectedPolicies: string[]
  ): boolean {
    const tablePolicies = policies
      .filter(policy => policy.tablename === tableName)
      .map(policy => policy.cmd);
    
    return expectedPolicies.every(cmd => tablePolicies.includes(cmd));
  }

  /**
   * Verify specific policy conditions
   */
  static verifyPolicyCondition(
    policies: RLSPolicy[],
    tableName: string,
    command: string,
    expectedCondition: string
  ): boolean {
    const policy = policies.find(
      p => p.tablename === tableName && p.cmd === command
    );
    
    if (!policy) return false;
    
    const condition = command === 'INSERT' ? policy.with_check : policy.qual;
    return condition === expectedCondition;
  }

  /**
   * Verify user_profiles policies are correctly configured
   */
  static verifyUserProfilesPolicies(policies: RLSPolicy[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check if all required policies exist
    const requiredPolicies = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    if (!this.verifyTablePolicies(policies, 'user_profiles', requiredPolicies)) {
      issues.push('Missing required policies for user_profiles table');
    }
    
    // Check SELECT policy
    if (!this.verifyPolicyCondition(
      policies, 
      'user_profiles', 
      'SELECT', 
      '(auth.uid() = user_id)'
    )) {
      issues.push('user_profiles SELECT policy condition is incorrect');
    }
    
    // Check INSERT policy
    if (!this.verifyPolicyCondition(
      policies, 
      'user_profiles', 
      'INSERT', 
      '(auth.uid() = user_id)'
    )) {
      issues.push('user_profiles INSERT policy condition is incorrect');
    }
    
    // Check UPDATE policy
    if (!this.verifyPolicyCondition(
      policies, 
      'user_profiles', 
      'UPDATE', 
      '(auth.uid() = user_id)'
    )) {
      issues.push('user_profiles UPDATE policy condition is incorrect');
    }
    
    // Check DELETE policy
    if (!this.verifyPolicyCondition(
      policies, 
      'user_profiles', 
      'DELETE', 
      '(auth.uid() = user_id)'
    )) {
      issues.push('user_profiles DELETE policy condition is incorrect');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Verify incidents policies are correctly configured
   */
  static verifyIncidentsPolicies(policies: RLSPolicy[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check if all required policies exist
    const requiredPolicies = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    if (!this.verifyTablePolicies(policies, 'incidents', requiredPolicies)) {
      issues.push('Missing required policies for incidents table');
    }
    
    // Check SELECT policy (should include soft delete check)
    if (!this.verifyPolicyCondition(
      policies, 
      'incidents', 
      'SELECT', 
      '((auth.uid() = user_id) AND (is_deleted = false))'
    )) {
      issues.push('incidents SELECT policy condition is incorrect');
    }
    
    // Check INSERT policy
    if (!this.verifyPolicyCondition(
      policies, 
      'incidents', 
      'INSERT', 
      '(auth.uid() = user_id)'
    )) {
      issues.push('incidents INSERT policy condition is incorrect');
    }
    
    // Check UPDATE policy
    if (!this.verifyPolicyCondition(
      policies, 
      'incidents', 
      'UPDATE', 
      '(auth.uid() = user_id)'
    )) {
      issues.push('incidents UPDATE policy condition is incorrect');
    }
    
    // Check DELETE policy
    if (!this.verifyPolicyCondition(
      policies, 
      'incidents', 
      'DELETE', 
      '(auth.uid() = user_id)'
    )) {
      issues.push('incidents DELETE policy condition is incorrect');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Comprehensive RLS verification
   */
  static verifyAllPolicies(tables: RLSTable[], policies: RLSPolicy[]): {
    isValid: boolean;
    issues: string[];
    summary: {
      rlsEnabled: boolean;
      userProfilesPolicies: boolean;
      incidentsPolicies: boolean;
    };
  } {
    const issues: string[] = [];
    
    // Check RLS is enabled
    const rlsEnabled = this.verifyRLSEnabled(tables, ['user_profiles', 'incidents']);
    if (!rlsEnabled) {
      issues.push('RLS is not enabled on required tables');
    }
    
    // Check user_profiles policies
    const userProfilesCheck = this.verifyUserProfilesPolicies(policies);
    if (!userProfilesCheck.isValid) {
      issues.push(...userProfilesCheck.issues);
    }
    
    // Check incidents policies
    const incidentsCheck = this.verifyIncidentsPolicies(policies);
    if (!incidentsCheck.isValid) {
      issues.push(...incidentsCheck.issues);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      summary: {
        rlsEnabled,
        userProfilesPolicies: userProfilesCheck.isValid,
        incidentsPolicies: incidentsCheck.isValid
      }
    };
  }
}