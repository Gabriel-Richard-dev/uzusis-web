// issuer null = mesma origem: location.origin + '/auth/realms/uzusis' (nginx faz o proxy de /auth).
export const environment = {
  production: true,
  issuer: null as string | null,
};
