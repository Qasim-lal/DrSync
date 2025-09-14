/**
 * Simple test to verify testUtils database connection
 */

import { testPrisma, createTestOrganization, cleanupTestData } from './testUtils';

describe('TestUtils Database Connection', () => {
  
  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  it('should connect to database successfully', async () => {
    const count = await testPrisma.organization.count();
    expect(typeof count).toBe('number');
  });

  it('should create test organization', async () => {
    const orgId = await createTestOrganization({
      name: 'Test Utils Clinic'
    });
    
    expect(orgId).toBeDefined();
    expect(orgId.startsWith('test-org-')).toBeTruthy();
    
    const org = await testPrisma.organization.findUnique({
      where: { id: orgId }
    });
    
    expect(org).toBeTruthy();
    expect(org?.name).toBe('Test Utils Clinic');
  });
  
});