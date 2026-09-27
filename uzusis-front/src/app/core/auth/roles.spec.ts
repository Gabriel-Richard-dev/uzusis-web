import { extrairRoles } from './roles';

const b64url = (o: object) =>
  btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const token = (payload: object) => `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(payload)}.assinatura`;

describe('extrairRoles', () => {
  it('lê ADMIN de realm_access.roles', () => {
    const roles = extrairRoles(token({ sub: 'abc', realm_access: { roles: ['offline_access', 'ADMIN', 'CUSTOMER'] } }));
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('CUSTOMER');
  });

  it('ignora papéis de client (resource_access)', () => {
    expect(extrairRoles(token({ sub: 'abc', resource_access: { 'web-app': { roles: ['ADMIN'] } } }))).toEqual([]);
  });

  it('token sem o claim, vazio ou ilegível → lista vazia', () => {
    expect(extrairRoles(token({ sub: 'abc' }))).toEqual([]);
    expect(extrairRoles(null)).toEqual([]);
    expect(extrairRoles('não-é-jwt')).toEqual([]);
  });
});
