import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pedidos',
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.scss']
})
export class PedidosComponent implements OnInit {

  aba = 'conta';
  emAndamento: any[] = [];
  historico: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.carregar('em-andamento').subscribe({
      next: res => this.emAndamento = res,
      error: () => {}
    });
    this.carregar('historico').subscribe({
      next: res => this.historico = res,
      error: () => {}
    });
  }

  selecionar(aba: string) {
    this.aba = aba;
  }

  private carregar(rota: string): Observable<any[]> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
    return this.http.get<any[]>(`${environment.apiUrl}/compra/cliente/${rota}`, { headers });
  }
}
