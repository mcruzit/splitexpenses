import { LitElement, html } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

class AddExpenseView extends LitElement {
  static properties = {
    _uuid: { state: true },
    people: { state: true }
  };

  constructor() {
    super();
    this.people = [];
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click=${() => this.dismiss()}> 
              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Agregar Gasto</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card>
          <ion-card-content>
            <ion-item>
              <ion-input id="input-descripcion-gasto" label="Descripción" label-placement="floating" placeholder="Ej: Cena" clear-input="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input id="input-monto-gasto" type="number" label="Monto" label-placement="floating" placeholder="Ej: 50" clear-input="true"></ion-input>
            </ion-item>
            <ion-item>
              <ion-select id="select-pagador" label="Pagado por" interface="alert" placeholder="Seleccionar persona">
                ${this.people.map(person => html`<ion-select-option .value=${person.id}>${person.name}</ion-select-option>`)}
              </ion-select>
            </ion-item>
            <ion-button @click=${this.addExpense} expand="block" class="ion-margin-top">Agregar Gasto</ion-button>
          </ion-card-content>
        </ion-card>
      </ion-content>
    `;
  }

  addExpense() {
    const description = this.shadowRoot.getElementById('input-descripcion-gasto').value.trim();
    const amount = parseFloat(this.shadowRoot.getElementById('input-monto-gasto').value);
    const person_id = this.shadowRoot.getElementById('select-pagador').value;

    if (!description || !(amount > 0) || !person_id) {
      this.showAlert('Por favor, completa todos los campos del gasto correctamente.');
      return;
    }
    
    this.dismiss({ description, amount, person_id });
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

customElements.define('add-expense-view', AddExpenseView);

