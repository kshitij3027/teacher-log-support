/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { RLSVerificationService, RLSPolicy, RLSTable } from '../rls-verification';

describe('RLS Integration Verification', () => {
  it('fails when RLS is not enabled on all required tables', () => {
    const tables: RLSTable[] = [
      { schemaname: 'public', tablename: 'user_profiles', rowsecurity: true },
      { schemaname: 'public', tablename: 'incidents', rowsecurity: false },
    ];

    const policies: RLSPolicy[] = [];

    const result = RLSVerificationService.verifyAllPolicies(tables, policies);
    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      'RLS is not enabled on required tables',
      'Missing required policies for user_profiles table',
      'Missing required policies for incidents table',
    ]));
  });

  it('fails when policy conditions are incorrect', () => {
    const tables: RLSTable[] = [
      { schemaname: 'public', tablename: 'user_profiles', rowsecurity: true },
      { schemaname: 'public', tablename: 'incidents', rowsecurity: true },
    ];

    const policies: RLSPolicy[] = [
      { schemaname: 'public', tablename: 'user_profiles', policyname: 'select_own', permissive: 'PERMISSIVE', cmd: 'SELECT', qual: '(auth.uid() = id)', with_check: null },
      { schemaname: 'public', tablename: 'user_profiles', policyname: 'insert_own', permissive: 'PERMISSIVE', cmd: 'INSERT', qual: null, with_check: '(auth.uid() = id)' },
      { schemaname: 'public', tablename: 'user_profiles', policyname: 'update_own', permissive: 'PERMISSIVE', cmd: 'UPDATE', qual: '(auth.uid() = id)', with_check: null },
      { schemaname: 'public', tablename: 'user_profiles', policyname: 'delete_own', permissive: 'PERMISSIVE', cmd: 'DELETE', qual: '(auth.uid() = id)', with_check: null },
      { schemaname: 'public', tablename: 'incidents', policyname: 'select_own', permissive: 'PERMISSIVE', cmd: 'SELECT', qual: '(auth.uid() = user_id)', with_check: null },
      { schemaname: 'public', tablename: 'incidents', policyname: 'insert_own', permissive: 'PERMISSIVE', cmd: 'INSERT', qual: null, with_check: '(auth.uid() = user_id)' },
      { schemaname: 'public', tablename: 'incidents', policyname: 'update_own', permissive: 'PERMISSIVE', cmd: 'UPDATE', qual: '(auth.uid() = user_id)', with_check: null },
      { schemaname: 'public', tablename: 'incidents', policyname: 'delete_own', permissive: 'PERMISSIVE', cmd: 'DELETE', qual: '(auth.uid() = user_id)', with_check: null },
    ];

    const result = RLSVerificationService.verifyAllPolicies(tables, policies);
    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      'user_profiles SELECT policy condition is incorrect',
      'user_profiles INSERT policy condition is incorrect',
      'user_profiles UPDATE policy condition is incorrect',
      'user_profiles DELETE policy condition is incorrect',
      'incidents SELECT policy condition is incorrect',
    ]));
  });

  it('passes when RLS is enabled and policies match schema expectations', () => {
    const tables: RLSTable[] = [
      { schemaname: 'public', tablename: 'user_profiles', rowsecurity: true },
      { schemaname: 'public', tablename: 'incidents', rowsecurity: true },
    ];

    const policies: RLSPolicy[] = [
      // user_profiles
      { schemaname: 'public', tablename: 'user_profiles', policyname: 'Users can view their own profile', permissive: 'PERMISSIVE', cmd: 'SELECT', qual: '(auth.uid() = user_id)', with_check: null },
      { schemaname: 'public', tablename: 'user_profiles', policyname: 'Users can insert their own profile', permissive: 'PERMISSIVE', cmd: 'INSERT', qual: null, with_check: '(auth.uid() = user_id)' },
      { schemaname: 'public', tablename: 'user_profiles', policyname: 'Users can update their own profile', permissive: 'PERMISSIVE', cmd: 'UPDATE', qual: '(auth.uid() = user_id)', with_check: null },
      { schemaname: 'public', tablename: 'user_profiles', policyname: 'Users can delete their own profile', permissive: 'PERMISSIVE', cmd: 'DELETE', qual: '(auth.uid() = user_id)', with_check: null },
      // incidents
      { schemaname: 'public', tablename: 'incidents', policyname: 'Users can view their own incidents', permissive: 'PERMISSIVE', cmd: 'SELECT', qual: '((auth.uid() = user_id) AND (is_deleted = false))', with_check: null },
      { schemaname: 'public', tablename: 'incidents', policyname: 'Users can insert their own incidents', permissive: 'PERMISSIVE', cmd: 'INSERT', qual: null, with_check: '(auth.uid() = user_id)' },
      { schemaname: 'public', tablename: 'incidents', policyname: 'Users can update their own incidents', permissive: 'PERMISSIVE', cmd: 'UPDATE', qual: '(auth.uid() = user_id)', with_check: null },
      { schemaname: 'public', tablename: 'incidents', policyname: 'Users can delete their own incidents', permissive: 'PERMISSIVE', cmd: 'DELETE', qual: '(auth.uid() = user_id)', with_check: null },
    ];

    const result = RLSVerificationService.verifyAllPolicies(tables, policies);
    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.summary).toEqual({
      rlsEnabled: true,
      userProfilesPolicies: true,
      incidentsPolicies: true,
    });
  });
});


