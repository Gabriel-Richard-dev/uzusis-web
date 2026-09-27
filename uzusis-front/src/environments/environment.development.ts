// Só para ng serve (fileReplacements da config development).
export const environment = {
  production: false,
  issuer: 'http://localhost:8080/auth/realms/uzusis' as string | null,
};
