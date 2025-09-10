import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

class AddPersonView extends LitElement {
  static properties = {
    _uuid: { state: true }
  };

  render() {
    return html`
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click=${() => this.dismiss()}> 
              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Agregar Persona</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card>
          <ion-card-content>
            <ion-item>
              <ion-input id="input-nombre-persona" label="Nombre de la persona" label-placement="floating" placeholder="Ej: Ana" clear-input="true" @ionInput=${(e) => e.target.value = e.target.value.slice(0,50)}></ion-input>
            </ion-item>
            <ion-button @click=${this.addPerson} expand="block" class="ion-margin-top">Agregar Persona</ion-button>
          </ion-card-content>
        </ion-card>
      </ion-content>
    `;
  }

  addPerson() {
    const input = this.shadowRoot.getElementById('input-nombre-persona');
    const name = input.value.trim();
    if (!name) {
      this.showAlert('Por favor, ingresa un nombre.');
      return;
    }
    this.dismiss({ name });
  }

  dismiss(data = null) {
    const modal = this.closest('ion-modal');
    if (modal) {
      modal.dismiss(data, data ? 'confirm' : 'cancel');
    }
  }

  async showAlert(message, header = 'Atención') {
    const alert = document.createElement('ion-alert');
    alert.header = header;
    alert.message = message;
    alert.buttons = ['OK'];
    document.body.appendChild(alert);
    await alert.present();
  }
}

customElements.define('add-person-view', AddPersonView);

