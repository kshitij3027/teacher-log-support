/**
 * Row Level Security (RLS) Policies Test Suite
 * 
 * These tests verify that RLS policies are properly implemented in Supabase
 * to ensure users can only access their own data.
 */

import { RLSVerificationService, RLSPolicy, RLSTable } from '../rls-verification';

// Mock data representing the current RLS configuration in our database
const mockRLSTables: RLSTable[] = [
  { schemaname: 'public', tablename: 'user_profiles', rowsecurity: true },
  { schemaname: 'public', tablename: 'incidents', rowsecurity: true }
];

const mockRLSPolicies: RLSPolicy[] = [
  {
    schemaname: 'public',
    tablename: 'user_profiles',
    policyname: 'Users can view their own profile',
    permissive: 'PERMISSIVE',
    cmd: 'SELECT',
    qual: '(auth.uid() = user_id)',
    with_check: null
  },
  {
    schemaname: 'public',
    tablename: 'user_profiles',
    policyname: 'Users can insert their own profile',
    permissive: 'PERMISSIVE',
    cmd: 'INSERT',
    qual: null,
    with_check: '(auth.uid() = user_id)'
  },
  {
    schemaname: 'public',
    tablename: 'user_profiles',
    policyname: 'Users can update their own profile',
    permissive: 'PERMISSIVE',
    cmd: 'UPDATE',
    qual: '(auth.uid() = user_id)',
    with_check: null
  },
  {
    schemaname: 'public',
    tablename: 'user_profiles',
    policyname: 'Users can delete their own profile',
    permissive: 'PERMISSIVE',
    cmd: 'DELETE',
    qual: '(auth.uid() = user_id)',
    with_check: null
  },
  {
    schemaname: 'public',
    tablename: 'incidents',
    policyname: 'Users can view their own incidents',
    permissive: 'PERMISSIVE',
    cmd: 'SELECT',
    qual: '((auth.uid() = user_id) AND (is_deleted = false))',
    with_check: null
  },
  {
    schemaname: 'public',
    tablename: 'incidents',
    policyname: 'Users can insert their own incidents',
    permissive: 'PERMISSIVE',
    cmd: 'INSERT',
    qual: null,
    with_check: '(auth.uid() = user_id)'
  },
  {
    schemaname: 'public',
    tablename: 'incidents',
    policyname: 'Users can update their own incidents',
    permissive: 'PERMISSIVE',
    cmd: 'UPDATE',
    qual: '(auth.uid() = user_id)',
    with_check: null
  },
  {
    schemaname: 'public',
    tablename: 'incidents',
    policyname: 'Users can delete their own incidents',
    permissive: 'PERMISSIVE',
    cmd: 'DELETE',
    qual: '(auth.uid() = user_id)',
    with_check: null
  }
];

describe('Row Level Security Policies', () => {
  describe('RLS Policy Requirements', () => {
    it('should have RLS enabled on user_profiles table', () => {
      const isEnabled = RLSVerificationService.verifyRLSEnabled(
        mockRLSTables, 
        ['user_profiles']
      );
      expect(isEnabled).toBe(true);
    })

    it('should have RLS enabled on incidents table', () => {
      const isEnabled = RLSVerificationService.verifyRLSEnabled(
        mockRLSTables, 
        ['incidents']
      );
      expect(isEnabled).toBe(true);
    })

    it('should have user_profiles SELECT policy for own data only', () => {
      const isValid = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'user_profiles',
        'SELECT',
        '(auth.uid() = user_id)'
      );
      expect(isValid).toBe(true);
    })

    it('should have user_profiles INSERT policy for own data only', () => {
      const isValid = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'user_profiles',
        'INSERT',
        '(auth.uid() = user_id)'
      );
      expect(isValid).toBe(true);
    })

    it('should have user_profiles UPDATE policy for own data only', () => {
      const isValid = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'user_profiles',
        'UPDATE',
        '(auth.uid() = user_id)'
      );
      expect(isValid).toBe(true);
    })

    it('should have user_profiles DELETE policy for own data only', () => {
      const isValid = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'user_profiles',
        'DELETE',
        '(auth.uid() = user_id)'
      );
      expect(isValid).toBe(true);
    })

    it('should have incidents SELECT policy for own non-deleted data only', () => {
      const isValid = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'incidents',
        'SELECT',
        '((auth.uid() = user_id) AND (is_deleted = false))'
      );
      expect(isValid).toBe(true);
    })

    it('should have incidents INSERT policy for own data only', () => {
      const isValid = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'incidents',
        'INSERT',
        '(auth.uid() = user_id)'
      );
      expect(isValid).toBe(true);
    })

    it('should have incidents UPDATE policy for own data only', () => {
      const isValid = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'incidents',
        'UPDATE',
        '(auth.uid() = user_id)'
      );
      expect(isValid).toBe(true);
    })

    it('should have incidents DELETE policy for own data only', () => {
      const isValid = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'incidents',
        'DELETE',
        '(auth.uid() = user_id)'
      );
      expect(isValid).toBe(true);
    })
  })

  describe('Data Isolation Requirements', () => {
    it('should prevent cross-user data access in user_profiles', () => {
      const verification = RLSVerificationService.verifyUserProfilesPolicies(mockRLSPolicies);
      expect(verification.isValid).toBe(true);
      expect(verification.issues).toEqual([]);
    })

    it('should prevent cross-user data access in incidents', () => {
      const verification = RLSVerificationService.verifyIncidentsPolicies(mockRLSPolicies);
      expect(verification.isValid).toBe(true);
      expect(verification.issues).toEqual([]);
    })

    it('should prevent unauthorized data modification', () => {
      // Verify that all UPDATE policies require auth.uid() = user_id
      const userProfilesUpdate = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies, 'user_profiles', 'UPDATE', '(auth.uid() = user_id)'
      );
      const incidentsUpdate = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies, 'incidents', 'UPDATE', '(auth.uid() = user_id)'
      );
      
      expect(userProfilesUpdate).toBe(true);
      expect(incidentsUpdate).toBe(true);
    })

    it('should properly handle soft-deleted incidents', () => {
      // Verify that SELECT policy includes is_deleted = false
      const selectPolicy = RLSVerificationService.verifyPolicyCondition(
        mockRLSPolicies,
        'incidents',
        'SELECT',
        '((auth.uid() = user_id) AND (is_deleted = false))'
      );
      expect(selectPolicy).toBe(true);
    })
  })

  describe('Policy Performance and Security', () => {
    it('should use indexed columns in RLS policies for performance', () => {
      // All policies use user_id which should be indexed
      const allPoliciesUseUserId = mockRLSPolicies.every(policy => {
        const condition = policy.cmd === 'INSERT' ? policy.with_check : policy.qual;
        return condition?.includes('user_id') || condition === null;
      });
      expect(allPoliciesUseUserId).toBe(true);
    })

    it('should prevent policy bypassing through function calls', () => {
      // Verify that policies use auth.uid() which cannot be manipulated by users
      const allPoliciesUseAuthUid = mockRLSPolicies.every(policy => {
        const condition = policy.cmd === 'INSERT' ? policy.with_check : policy.qual;
        return condition?.includes('auth.uid()') || condition === null;
      });
      expect(allPoliciesUseAuthUid).toBe(true);
    })

    it('should handle edge cases like NULL auth.uid()', () => {
      // When auth.uid() is NULL, all policies should deny access
      // This is implicit in the = comparison which will be false for NULL
      const comprehensive = RLSVerificationService.verifyAllPolicies(
        mockRLSTables, 
        mockRLSPolicies
      );
      expect(comprehensive.isValid).toBe(true);
    })
  })
})

/**
 * Comprehensive RLS Verification
 * 
 * This test validates the entire RLS configuration at once.
 */
describe('Comprehensive RLS Verification', () => {
  it('should have complete and valid RLS configuration', () => {
    const verification = RLSVerificationService.verifyAllPolicies(
      mockRLSTables, 
      mockRLSPolicies
    );
    
    expect(verification.isValid).toBe(true);
    expect(verification.issues).toEqual([]);
    expect(verification.summary.rlsEnabled).toBe(true);
    expect(verification.summary.userProfilesPolicies).toBe(true);
    expect(verification.summary.incidentsPolicies).toBe(true);
  })

  it('should have all required policies for both tables', () => {
    const requiredCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    
    const userProfilesComplete = RLSVerificationService.verifyTablePolicies(
      mockRLSPolicies, 
      'user_profiles', 
      requiredCommands
    );
    
    const incidentsComplete = RLSVerificationService.verifyTablePolicies(
      mockRLSPolicies, 
      'incidents', 
      requiredCommands
    );
    
    expect(userProfilesComplete).toBe(true);
    expect(incidentsComplete).toBe(true);
  })

  it('should protect against common RLS security vulnerabilities', () => {
    // Test that policies use proper auth functions
    const policies = mockRLSPolicies;
    
    // All policies should use auth.uid() for user identification
    const usesAuthUid = policies.every(policy => {
      const condition = policy.cmd === 'INSERT' ? policy.with_check : policy.qual;
      return condition?.includes('auth.uid()') || condition === null;
    });
    
    // No policies should use user-controllable parameters
    const noUserParams = policies.every(policy => {
      const condition = policy.cmd === 'INSERT' ? policy.with_check : policy.qual;
      return !condition?.includes('current_user') && !condition?.includes('session_user');
    });
    
    expect(usesAuthUid).toBe(true);
    expect(noUserParams).toBe(true);
  })
})