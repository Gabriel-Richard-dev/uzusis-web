import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { jwtDecode } from "jwt-decode";

// Presença do token não basta: um JWT vencido deixaria a tela abrir só pra
// tomar 401 em seguida. Confere o `exp` antes de liberar.
function tokenValido(chave: string): boolean {
  const token = localStorage.getItem(chave);
  if (!token) return false;

  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return exp !== undefined && exp * 1000 > Date.now();
  } catch {
    localStorage.removeItem(chave);
    return false;
  }
}

// Cliente guarda em `token`, admin em `tokenAdm`, cada um volta pro seu login.
function exigirLogin(chave: string, login: string): CanActivateFn {
  return () => {
    if (tokenValido(chave)) return true;
    localStorage.removeItem(chave);
    return inject(Router).createUrlTree([login]);
  };
}

export const clienteGuard = exigirLogin("token", "/login");
export const adminGuard = exigirLogin("tokenAdm", "/admin");
