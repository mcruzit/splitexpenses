import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

class WelcomeView extends LitElement {
  static styles = css`
    .welcome-card {
      opacity: 0;
      transform: translateY(20px);
      animation: fadeInUp 0.5s ease-out forwards;
    }

    @keyframes fadeInUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  static properties = {
    recentGroups: { state: true },
    _router: { state: true }
  };

  constructor() {
    super();
    this.recentGroups = this.getRecentGroups();
    this._router = null;
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar>
          <ion-title>Divisor de Gastos</ion-title>
          <ion-buttons slot="end">
            <ion-button @click=${() => this._router.navigate('/config')}>
              <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        ${this.recentGroups.length > 0 ? this.renderRecentGroups() : ''}
        ${this.renderCreateGroupCard()}
        ${this.renderJoinGroupCard()}
      </ion-content>
    `;
  }

  renderRecentGroups() {
    return html`
      <ion-card class="welcome-card">
        <ion-card-header>
          <ion-card-title>Grupos Recientes</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            ${this.recentGroups.map(group => html`
              <ion-item>
                <ion-label @click=${() => this.joinGroup(group.uuid)}>
                  <h2>${group.name}</h2>
                </ion-label>
                <ion-buttons slot="end">
                  <ion-button @click=${(e) => {
                    e.stopPropagation();
                    this.shareGroup(group)}}
                   fill="clear">
                    <ion-icon slot="icon-only" name="share-social-outline"></ion-icon>
                  </ion-button>
                  <ion-button @click=${(e) => {
                    e.stopPropagation();
                    this.confirmDelete(group)}}
                   fill="clear">
                    <ion-icon slot="icon-only" name="trash-outline" color="danger"></ion-icon>
                  </ion-button>
                </ion-buttons>
              </ion-item>
            `)}
          </ion-list>
        </ion-card-content>
      </ion-card>
    `;
  }

  renderCreateGroupCard() {
    return html`
      <ion-card class="welcome-card" style="animation-delay: 0.1s;">
        <ion-card-header>
          <ion-card-title>Iniciar un Nuevo Grupo</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-input id="input-crear-grupo" label="Nombre del Grupo" label-placement="floating" placeholder="Ej: Viaje a la playa" clear-input="true"></ion-input>
          </ion-item>
          <ion-button @click=${this.createGroup} expand="block" class="ion-margin-top">Crear Grupo</ion-button>
        </ion-card-content>
      </ion-card>
    `;
  }

  renderJoinGroupCard() {
    return html`
      <ion-card class="welcome-card" style="animation-delay: 0.2s;">
        <ion-card-header>
          <ion-card-title>Unirse a un Grupo Existente</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-input id="input-unirse-grupo" label="Código del Grupo" label-placement="floating" placeholder="Ingresa el código" clear-input="true"></ion-input>
          </ion-item>
          <ion-button @click=${() => this.joinGroup(null)} expand="block" class="ion-margin-top">Unirse</ion-button>
        </ion-card-content>
      </ion-card>
    `;
  }

  async createGroup() {
    const input = this.shadowRoot.getElementById('input-crear-grupo');
    const groupName = input.value.trim();
    if (!groupName) {
      this.showAlert('Por favor, ingresa un nombre para el grupo.');
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName }),
      });
      const group = await response.json();
      if (!response.ok) throw new Error(group.error || 'Error al crear el grupo');
      
      this.saveRecentGroup(group);
      this._router.navigate(`/group/${group.uuid}`);
    } catch (error) {
      this.showAlert(`No se pudo crear el grupo: ${error.message}`, 'Error');
    }
  }

  async joinGroup(uuid) {
    const groupUuid = uuid || this.shadowRoot.getElementById('input-unirse-grupo').value.trim();
    if (!groupUuid) {
      this.showAlert('Por favor, ingresa un código de grupo válido.');
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupUuid}`);
      const group = await response.json();
      if (!response.ok) throw new Error(group.error || 'Grupo no encontrado');

      this.saveRecentGroup(group);
      this._router.navigate(`/group/${group.uuid}`);
    } catch (error) {
      this.showAlert(`No se pudo unir al grupo: ${error.message}`, 'Error');
    }
  }

  async confirmDelete(group) {
    const actionSheet = document.createElement('ion-action-sheet');
    actionSheet.header = 'Eliminar Grupo';
    actionSheet.buttons = [
      {
        text: 'Eliminar para todos',
        role: 'destructive',
        handler: () => {
          this.deleteGroupForAll(group);
        },
      },
      {
        text: 'Eliminar sólo de mi lista',
        handler: () => {
          this.deleteGroupFromMyList(group);
        },
      },
      {
        text: 'Cancelar',
        role: 'cancel',
      },
    ];
    document.body.appendChild(actionSheet);
    await actionSheet.present();
  }

  deleteGroupFromMyList(group) {
    let recentGroups = this.getRecentGroups();
    recentGroups = recentGroups.filter(g => g.uuid !== group.uuid);
    localStorage.setItem('gastos_grupos_recientes', JSON.stringify(recentGroups));
    this.recentGroups = recentGroups;
  }

  async deleteGroupForAll(group) {
    try {
      const response = await fetch(`/api/groups/${group.uuid}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el grupo');
      }
      this.deleteGroupFromMyList(group);
    } catch (error) {
      this.showAlert(`No se pudo eliminar el grupo: ${error.message}`, 'Error');
    }
  }

  getRecentGroups() {
    return JSON.parse(localStorage.getItem('gastos_grupos_recientes')) || [];
  }

  saveRecentGroup(group) {
    let recentGroups = this.getRecentGroups();
    recentGroups = recentGroups.filter(g => g.uuid !== group.uuid);
    recentGroups.unshift({ id: group.id, name: group.name, uuid: group.uuid });
    localStorage.setItem('gastos_grupos_recientes', JSON.stringify(recentGroups.slice(0, 5)));
    this.recentGroups = recentGroups;
  }

  async showAlert(message, header = 'Atención') {
    const alert = document.createElement('ion-alert');
    alert.header = header;
    alert.message = message;
    alert.buttons = ['OK'];
    document.body.appendChild(alert);
    await alert.present();
  }

  async shareGroup(group) {
    const shareData = {
        title: `Únete a mi grupo: ${group.name}`,
        text: `Usa este código para unirte al grupo y dividir gastos: ${group.uuid}`,
        url: `${window.location.origin}?join=${group.uuid}`
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error al usar Web Share API:', error);
                this.presentToast('Ocurrió un error al intentar compartir.', 'danger');
            }
        }
    } else if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
            this.presentToast('¡Enlace de invitación copiado al portapapeles!', 'success');
        } catch (error) {
            console.error('Error al copiar al portapapeles:', error);
            this.showManualCopyAlert(shareData.text, shareData.url);
        }
    } else {
        this.showManualCopyAlert(shareData.text, shareData.url);
    }
  }

  async showManualCopyAlert(text, url) {
    const alert = document.createElement('ion-alert');
    alert.header = 'Comparte este enlace';
    alert.message = 'Copia el siguiente texto y compártelo:';
    alert.inputs = [
        {
            type: 'textarea',
            value: `${text}\n${url}`,
            attributes: {
                readonly: true,
                style: 'height: 100px;'
            }
        }
    ];
    alert.buttons = ['OK'];
    document.body.appendChild(alert);
    await alert.present();
  }

  async presentToast(message, color = 'primary') {
    const toast = document.createElement('ion-toast');
    toast.message = message;
    toast.duration = 3000;
    toast.color = color;
    toast.position = 'top';
    document.body.appendChild(toast);
    await toast.present();
  }

  
}

customElements.define('welcome-view', WelcomeView);