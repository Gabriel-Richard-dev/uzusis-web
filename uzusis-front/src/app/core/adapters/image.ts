// base64-conversion.service.ts

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Base64ConversionService {

  constructor() { }

  convertFileToBase64(file: File | null, callback: (base64String: string) => void): void {
    if (!file) {
      console.error("Arquivo não fornecido para conversão em base64");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result.split(',')[1]);
      } else {
        console.error("Falha ao ler arquivo como base64");
      }
    };
    reader.readAsDataURL(file);
  }

  convertImageToBase64(imageUrl: string, callback: (base64String: string) => void): void {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Permite o acesso ao conteúdo da imagem de origem diferente
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const base64String = canvas.toDataURL('image/jpeg'); // Ajuste o tipo de imagem conforme necessário
        callback(base64String);
      } else {
        console.error("Erro ao converter imagem para base64: Contexto do canvas não encontrado");
      }
    };
    img.src = imageUrl;
  }
}
