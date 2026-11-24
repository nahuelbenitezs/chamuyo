import { Component, signal } from '@angular/core';
import { idioma } from './i18n';
import { PantallaAnfitrion } from './pantallas/anfitrion';
import { PantallaInicio } from './pantallas/inicio';
import { PantallaJugador } from './pantallas/jugador';

type Pantalla = 'inicio' | 'anfitrion' | 'jugador';

@Component({
  selector: 'app-root',
  imports: [PantallaInicio, PantallaAnfitrion, PantallaJugador],
  template: `
    @switch (pantalla()) {
      @case ('inicio') {
        <app-inicio (crear)="pantalla.set('anfitrion')" (unirse)="pantalla.set('jugador')" />
      }
      @case ('anfitrion') {
        <app-anfitrion />
      }
      @case ('jugador') {
        <app-jugador [codigoInicial]="sala" />
      }
    }
  `,
})
export class App {
  protected readonly sala = new URLSearchParams(location.search).get('sala') ?? '';
  protected pantalla = signal<Pantalla>(this.sala ? 'jugador' : 'inicio');

  constructor() {
    document.documentElement.lang = idioma();
  }
}
