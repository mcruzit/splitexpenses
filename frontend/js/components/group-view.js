import {LitElement, html, css} from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import {setGroup, getPushSubscriptionEndpoint} from '../state.js';
import { updateGroupInCache } from '../cache.js';
import { formatCurrency } from '../utils.js';

class GroupView extends LitElement {
    static styles = css `
    ion-fab {
      /* Mueve el FAB 55px hacia arriba para que no se solape con la barra de tabs */
      margin-bottom: 55px;
    }
    ion-fab-button {
      --box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    ion-list-header {
      font-size: 1.1rem;
      font-weight: 600;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60%;
      color: #888;
      text-align: center;
    }
    .empty-state ion-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
  `;

    static properties = {
        group: {
            state: true
        },
        _router: {
            state: true
        },
        _uuid: {
            state: true
        },
        activeTab: {
            state: true
        },
        debts: {
            state: true
        },
        filteredExpenses: {
            state: true
        },
        expenseFilter: {
            state: true
        },
        totalExpenses: {
            state: true
        }
    };

    constructor() {
        super();
        this.group = null;
        this._router = null;
        this._uuid = null;
        this.activeTab = 'people';
        this.debts = [];
        this.filteredExpenses = [];
        this.expenseFilter = 'all';
        this.totalExpenses = 0;
    }

    connectedCallback() {
        super.connectedCallback();
        this.fetchGroupDetails();
        this.connectWebSocket();
        // Escuchar mensajes del Service Worker
        if ('serviceWorker' in navigator) {
            this.swMessageHandler = (event) => {
                if (!event.data) 
                    return;
                
                if (event.data.type === 'SYNC_COMPLETE') {
                    this.presentToast('¡Sincronización completada!', 'success');
                    this.fetchGroupDetails(); // Forzar recarga de datos
                }

                if (event.data.type === 'CACHE_UPDATED') {
                    const requestUrl = new URL(event.data.url);
                    if (requestUrl.pathname === `/api/groups/${this._uuid}`) {
                        // Actualización silenciosa: no mostramos toast, solo refrescamos los datos.
                        this.group = event.data.data;
                        setGroup(this.group);
                        this.calculateDebts();
                        this.filterAndCalculateExpenses();
                    }
                }
            };
            navigator
                .serviceWorker
                .addEventListener('message', this.swMessageHandler);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.socket) {
            this.socket.close();
        }
        // Limpiar el listener cuando el componente se destruye
        if ('serviceWorker' in navigator && this.swMessageHandler) {
            navigator
                .serviceWorker
                .removeEventListener('message', this.swMessageHandler);
        }
    }

    connectWebSocket() {
        const wsProtocol = window.location.protocol === 'https' ? 'wss' : 'ws';
        this.socket = new WebSocket(`wss://${window.location.host}/api/groups/${this._uuid}/ws`);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
        };

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'GROUP_UPDATED') {
                this.fetchGroupDetails();
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    async fetchGroupDetails() {
        if (!this._uuid) {
            return;
        }
        try {
            const response = await fetch(
                `/api/groups/${this._uuid}`
            );
            if (!response.ok) 
                throw new Error('No se pudo cargar la información del grupo.');
            this.group = await response.json();
            setGroup(this.group);
            this.calculateDebts();
            this.filterAndCalculateExpenses();
        } catch (error) {
            console.error('Error fetching group details:', error);
            this.presentToast('Error al cargar el grupo. Intenta de nuevo.', 'danger');
        }
    }

    handleTabChange(event) {
        this.activeTab = event.detail.tab;
    }

    async handleRefresh() {
        await this.fetchGroupDetails();
        const refresher = this
            .shadowRoot
            .querySelector('ion-refresher');
        if (refresher) {
            refresher.complete();
        }
    }

    filterAndCalculateExpenses() {
        const expenses = this.group ? this.group.expenses : [];
        
        let filtered = [];
        if (this.expenseFilter === 'all') {
            filtered = expenses;
        } else {
            filtered = expenses.filter(expense => expense.person_id == this.expenseFilter);
        }
        
        this.filteredExpenses = filtered;
        this.totalExpenses = this.filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
    }

    handleExpenseFilterChange(event) {
        this.expenseFilter = event.detail.value;
        this.filterAndCalculateExpenses();
    }

    render() {
        if (!this.group) {
            return html `
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click=${ () => this
                ._router
                .navigate('/')}>
                <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
              </ion-button>
            </ion-buttons>
            <ion-title>Cargando...</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
            <ion-spinner></ion-spinner>
          </div>
        </ion-content>
      `;
        }

        return html `
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click=${ () => this
            ._router
            .navigate('/')}>
              <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>${this
            .group
            .name}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click=${this.editGroupName}>
              <ion-icon slot="icon-only" name="create-outline"></ion-icon>
            </ion-button>
            <ion-button @click=${this
            .shareGroup}>
              <ion-icon slot="icon-only" name="share-social-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-refresher slot="fixed" @ionRefresh=${this
            .handleRefresh}>
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>

        <ion-tabs @ionTabsDidChange=${this
            .handleTabChange}>
          <ion-tab tab="people">${this
            .renderPeople()}</ion-tab>
          <ion-tab tab="expenses">${this
            .renderExpenses()}</ion-tab>
          <ion-tab tab="debts">${this
            .renderDebts()}</ion-tab>

          <ion-tab-bar slot="bottom">
            <ion-tab-button tab="people">
              <ion-icon name="people-outline"></ion-icon>
              <ion-label>Personas</ion-label>
            </ion-tab-button>
            <ion-tab-button tab="expenses">
              <ion-icon name="receipt-outline"></ion-icon>
              <ion-label>Gastos</ion-label>
            </ion-tab-button>
            <ion-tab-button tab="debts">
              <ion-icon name="calculator-outline"></ion-icon>
              <ion-label>Deudas</ion-label>
            </ion-tab-button>
          </ion-tab-bar>
        </ion-tabs>
        ${this
            .renderFab()}
      </ion-content>
    `;
    }

    renderFab() {
        if (this.activeTab === 'people') {
            return html `
        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click=${ () => this.presentPersonModal()}>
            <ion-icon name="add"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      `;
        } else if (this.activeTab === 'expenses') {
            return html `
            <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button @click=${ () => this.presentExpenseModal()}>
                <ion-icon name="add"></ion-icon>
            </ion-fab-button>
            </ion-fab>
        `;
            
            return null;
        };
    }

    renderPeople() {
        return html`
      <ion-content class="ion-padding">
        ${this.group.people.length === 0
            ? html`
              <div class="empty-state">
                <ion-icon name="people-outline"></ion-icon>
                <h3>No hay personas</h3>
                <p>Agrega a la primera persona al grupo.</p>
              </div>
            `
            : html`
              <ion-list>
                ${this.group.people.map(
                  person => html`
                    <ion-item>
                      <ion-label>${person.name}</ion-label>
                      <ion-buttons slot="end">
                        <ion-button fill="clear" color="primary" @click=${() => this.editPerson(person)}>
                          <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                        </ion-button>
                        <ion-button fill="clear" @click=${() => this.confirmDelete('person', person.id)}>
                          <ion-icon slot="icon-only" name="trash-outline" color="danger"></ion-icon>
                        </ion-button>
                      </ion-buttons>
                    </ion-item>
                  `
                )}
              </ion-list>
            `}
      </ion-content>
    `;
    }

    renderExpenses() {
        return html`
      <ion-content class="ion-padding">
        ${this.group.expenses.length === 0
            ? html`
              <div class="empty-state">
                <ion-icon name="receipt-outline"></ion-icon>
                <h3>No hay gastos</h3>
                <p>Agrega el primer gasto para empezar a dividir.</p>
              </div>
            `
            : html`
              <ion-list>
                <ion-item>
                  <ion-select
                    label="Filtrar por persona"
                    interface="alert"
                    .value=${this.expenseFilter}
                    @ionChange=${this.handleExpenseFilterChange}
                  >
                    <ion-select-option value="all">Todos</ion-select-option>
                    ${this.group.people.map(
                      person => html`
                        <ion-select-option .value=${person.id}>${person.name}</ion-select-option>
                      `
                    )}
                  </ion-select>
                </ion-item>

                <ion-item lines="full">
                  <ion-label>
                    <h2 style="font-weight: 600;">Total de Gastos</h2>
                  </ion-label>
                  <ion-note slot="end" color="primary" style="font-size: 1.2rem; font-weight: 700;">
                    $ ${formatCurrency(this.totalExpenses)}
                  </ion-note>
                </ion-item>

                ${this.filteredExpenses.length === 0
                  ? html`
                      <ion-item>
                        <ion-label class="ion-text-center">No hay gastos para el filtro seleccionado.</ion-label>
                      </ion-item>
                    `
                  : this.filteredExpenses.map(
                      expense => html`
                        <ion-item>
                          <ion-label>
                            <h2>${expense.description}</h2>
                            <p>Pagado por ${expense.pagador} - $ ${formatCurrency(expense.amount)}</p>
                          </ion-label>
                          <ion-buttons slot="end">
                            <ion-button
                              fill="clear"
                              color="primary"
                              @click=${() => this.presentExpenseModal(expense)}
                            >
                              <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                            </ion-button>
                            <ion-button fill="clear" @click=${() => this.confirmDelete('expense', expense.id)}>
                              <ion-icon slot="icon-only" name="trash-outline" color="danger"></ion-icon>
                            </ion-button>
                          </ion-buttons>
                        </ion-item>
                      `
                    )}
              </ion-list>
            `}
      </ion-content>
    `;
    }

    async presentPersonModal() {
        const modal = document.createElement('ion-modal');
        modal.component = 'add-person-view';
        modal.componentProps = {
            _uuid: this._uuid
        };
        document.body.appendChild(modal);
        await modal.present();

        const { data, role } = await modal.onWillDismiss();
        if (role === 'confirm' && data) {
            this.handleAddPerson(data);
        }
    }

    async presentExpenseModal(expense = null) {
        const modal = document.createElement('ion-modal');
        modal.component = expense ? 'edit-expense-view' : 'add-expense-view';
        modal.componentProps = {
            _uuid: this._uuid,
            people: this.group.people,
            expense: expense
        };
        document.body.appendChild(modal);
        await modal.present();

        const { data, role } = await modal.onWillDismiss();
        if (role === 'confirm' && data) {
            if (expense) { // Si había un gasto, es una edición
                this.handleEditExpense(data);
            } else { // Si no, es uno nuevo
                this.handleAddExpense(data);
            }
        }
    }

    renderDebts() {
        return html`
      <ion-content class="ion-padding">
        ${this.debts.length === 0
            ? html`
              <div class="empty-state">
                <ion-icon name="calculator-outline"></ion-icon>
                <h3>Todo saldado</h3>
                <p>No hay deudas pendientes en el grupo.</p>
              </div>
            `
            : html`
              <ion-list>
                <ion-list-header>
                  <ion-label>Resumen de Deudas</ion-label>
                </ion-list-header>
                ${this.debts.map(
                  debt => html`
                    <ion-item>
                      <ion-label>
                        <p><strong>${debt.from}</strong> le debe a <strong>${debt.to}</strong></p>
                      </ion-label>
                      <ion-note slot="end" color="primary">$ ${formatCurrency(debt.amount)}</ion-note>
                    </ion-item>
                  `
                )}
              </ion-list>
            `}
      </ion-content>
    `;
    }

    updateRecentGroupName(uuid, newName) {
        const RECENT_GROUPS_KEY = 'gastos_grupos_recientes';
        try {
            let recentGroups = JSON.parse(localStorage.getItem(RECENT_GROUPS_KEY)) || [];
            const groupIndex = recentGroups.findIndex(g => g.uuid === uuid);
            if (groupIndex > -1) {
                recentGroups[groupIndex].name = newName;
                localStorage.setItem(RECENT_GROUPS_KEY, JSON.stringify(recentGroups));
            }
        } catch (e) {
            console.error("Could not update recent group name in local storage", e);
        }
    }

    updateRecentGroupName(uuid, newName) {
        const RECENT_GROUPS_KEY = 'gastos_grupos_recientes';
        try {
            let recentGroups = JSON.parse(localStorage.getItem(RECENT_GROUPS_KEY)) || [];
            const groupIndex = recentGroups.findIndex(g => g.uuid === uuid);
            if (groupIndex > -1) {
                recentGroups[groupIndex].name = newName;
                localStorage.setItem(RECENT_GROUPS_KEY, JSON.stringify(recentGroups));
            }
        } catch (e) {
            console.error("Could not update recent group name in local storage", e);
        }
    }

    async editGroupName() {
        const alert = document.createElement('ion-alert');
        alert.header = 'Editar Nombre del Grupo';
        alert.inputs = [{ name: 'name', type: 'text', value: this.group.name, placeholder: 'Nuevo nombre del grupo' }];
        alert.buttons = [
            { text: 'Cancelar', role: 'cancel' },
            {
                text: 'Guardar',
                handler: async (data) => {
                    const newName = data.name.trim();
                    if (!newName || newName === this.group.name) return;

                    const originalGroup = JSON.parse(JSON.stringify(this.group));
                    this.group.name = newName;
                    this.updateRecentGroupName(this._uuid, newName);
                    this.requestUpdate();

                    await updateGroupInCache(this._uuid, this.group);

                    const endpoint = await getPushSubscriptionEndpoint();
                    const headers = { 'Content-Type': 'application/json' };
                    if (endpoint) headers['X-Client-Endpoint'] = endpoint;

                    const response = await fetch(`/api/groups/${this._uuid}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ name: newName })
                    });

                    if (response.status === 202) {
                        this.presentToast('Estás sin conexión. Tu cambio se sincronizará más tarde.');
                    } else if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: 'No se pudo actualizar el nombre.' }));
                        this.presentToast(errorData.error, 'danger');
                        this.group = originalGroup;
                        this.updateRecentGroupName(this._uuid, originalGroup.name);
                        this.requestUpdate();
                        await updateGroupInCache(this._uuid, originalGroup);
                    } else {
                        this.presentToast('Nombre del grupo actualizado correctamente.');
                    }
                }
            }
        ];
        document.body.appendChild(alert);
        await alert.present();
    }

    async handleAddPerson(personData) {
        const tempId = `temp-${Date.now()}`;
        const newPerson = { id: tempId, name: personData.name };
        
        const originalGroup = JSON.parse(JSON.stringify(this.group));
        this.group.people.push(newPerson);
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/people`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: personData.name }),
        });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. Tu cambio se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo agregar la persona.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        } else {
            const savedPerson = await response.json();
            const personIndex = this.group.people.findIndex(p => p.id === tempId);
            if (personIndex > -1) {
                this.group.people[personIndex] = savedPerson;
                this.requestUpdate();
                await updateGroupInCache(this._uuid, this.group);
            }
        }
    }

    async handleAddExpense(expenseData) {
        const tempId = `temp-${Date.now()}`;
        const pagador = this.group.people.find(p => p.id === expenseData.person_id)?.name || 'N/A';
        const newExpense = { ...expenseData, id: tempId, pagador };

        const originalGroup = JSON.parse(JSON.stringify(this.group));
        this.group.expenses.push(newExpense);
        this.filterAndCalculateExpenses();
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/expenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify(expenseData),
        });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. Tu cambio se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo agregar el gasto.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.filterAndCalculateExpenses();
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        } else {
            const savedExpense = await response.json();
            const expenseIndex = this.group.expenses.findIndex(e => e.id === tempId);
            if (expenseIndex > -1) {
                this.group.expenses[expenseIndex] = savedExpense;
                this.filterAndCalculateExpenses();
                this.requestUpdate();
                await updateGroupInCache(this._uuid, this.group);
            }
        }
    }

    async handleEditExpense(expenseData) {
        const originalGroup = JSON.parse(JSON.stringify(this.group));
        const expenseIndex = this.group.expenses.findIndex(e => e.id === expenseData.id);
        if (expenseIndex === -1) return;

        const pagador = this.group.people.find(p => p.id === expenseData.person_id)?.name || 'N/A';
        this.group.expenses[expenseIndex] = { ...this.group.expenses[expenseIndex], ...expenseData, pagador };
        this.filterAndCalculateExpenses();
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/expenses/${expenseData.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(expenseData),
        });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. Tu cambio se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo actualizar el gasto.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.filterAndCalculateExpenses();
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        }
    }

    async editPerson(person) {
        const modal = document.createElement('ion-modal');
        modal.component = 'edit-person-view';
        modal.componentProps = { person };
        document.body.appendChild(modal);
        await modal.present();

        const { data, role } = await modal.onWillDismiss();
        if (role === 'confirm' && data) {
            this.handleEditPerson(data);
        }
    }

    async handleEditPerson(personData) {
        const { id, name } = personData;
        const originalGroup = JSON.parse(JSON.stringify(this.group));
        const personIndex = this.group.people.findIndex(p => p.id === id);

        if (personIndex === -1 || this.group.people[personIndex].name === name) {
            return; // No changes needed
        }

        this.group.people[personIndex].name = name;
        this.calculateDebts();
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/people/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name })
        });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. Tu cambio se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo actualizar la persona.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.calculateDebts();
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        } else {
            this.presentToast('Persona actualizada correctamente.');
        }
    }

    async confirmDelete(type, id) {
        const alert = document.createElement('ion-alert');
        alert.header = 'Confirmar eliminación';
        alert.message = `¿Estás seguro de que quieres eliminar est${type === 'person' ? 'a persona' : 'e gasto'}? Esta acción no se puede deshacer.`;
        alert.buttons = [
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Eliminar', handler: () => {
                if (type === 'person') this.deletePerson(id);
                else this.deleteExpense(id);
            }}
        ];
        document.body.appendChild(alert);
        await alert.present();
    }

    async deletePerson(personId) {
        const originalGroup = JSON.parse(JSON.stringify(this.group));
        const personIndex = this.group.people.findIndex(p => p.id === personId);
        if (personIndex > -1) {
            this.group.people.splice(personIndex, 1);
        }
        this.calculateDebts();
        this.filterAndCalculateExpenses();
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/people/${personId}`, { method: 'DELETE', headers });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. La eliminación se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo eliminar la persona.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.calculateDebts();
            this.filterAndCalculateExpenses();
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        } else {
            this.presentToast('Persona eliminada correctamente.');
        }
    }

    async deleteExpense(expenseId) {
        const originalGroup = JSON.parse(JSON.stringify(this.group));
        const expenseIndex = this.group.expenses.findIndex(e => e.id === expenseId);
        if (expenseIndex > -1) {
            this.group.expenses.splice(expenseIndex, 1);
        }
        this.calculateDebts();
        this.filterAndCalculateExpenses();
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/expenses/${expenseId}`, { method: 'DELETE', headers });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. La eliminación se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo eliminar el gasto.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.calculateDebts();
            this.filterAndCalculateExpenses();
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        } else {
            this.presentToast('Gasto eliminado correctamente.');
        }
    }

    async handleAddPerson(personData) {
        const tempId = `temp-${Date.now()}`;
        const newPerson = { id: tempId, name: personData.name };
        
        const originalGroup = JSON.parse(JSON.stringify(this.group));
        this.group.people.push(newPerson);
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        try {
            const endpoint = await getPushSubscriptionEndpoint();
            const headers = { 'Content-Type': 'application/json' };
            if (endpoint) headers['X-Client-Endpoint'] = endpoint;

            const response = await fetch(`/api/groups/${this._uuid}/people`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: personData.name }),
            });

            const savedPerson = await response.json();

            if (response.status === 202) {
                this.presentToast('Estás sin conexión. Tu cambio se sincronizará más tarde.');
            } else if (!response.ok) {
                throw new Error(savedPerson.error || 'Error desconocido');
            } else {
                // Actualizar con el ID real del servidor
                const personIndex = this.group.people.findIndex(p => p.id === tempId);
                if (personIndex > -1) {
                    this.group.people[personIndex] = savedPerson;
                    this.requestUpdate();
                    await updateGroupInCache(this._uuid, this.group);
                }
            }
        } catch (error) {
            this.presentToast(`No se pudo agregar la persona: ${error.message}`, 'danger');
            this.group = originalGroup; // Revertir
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        }
    }

    async handleAddExpense(expenseData) {
        const tempId = `temp-${Date.now()}`;
        const pagador = this.group.people.find(p => p.id === expenseData.person_id)?.name || 'N/A';
        const newExpense = { ...expenseData, id: tempId, pagador };

        const originalGroup = JSON.parse(JSON.stringify(this.group));
        this.group.expenses.push(newExpense);
        this.filterAndCalculateExpenses();
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/expenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify(expenseData),
        });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. Tu cambio se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo agregar el gasto.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.filterAndCalculateExpenses();
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        } else {
            const savedExpense = await response.json();
            const expenseIndex = this.group.expenses.findIndex(e => e.id === tempId);
            if (expenseIndex > -1) {
                this.group.expenses[expenseIndex] = savedExpense;
                this.filterAndCalculateExpenses();
                this.requestUpdate();
                await updateGroupInCache(this._uuid, this.group);
            }
        }
    }

    async handleEditExpense(expenseData) {
        const originalGroup = JSON.parse(JSON.stringify(this.group));
        const expenseIndex = this.group.expenses.findIndex(e => e.id === expenseData.id);
        if (expenseIndex === -1) return;

        const pagador = this.group.people.find(p => p.id === expenseData.person_id)?.name || 'N/A';
        this.group.expenses[expenseIndex] = { ...this.group.expenses[expenseIndex], ...expenseData, pagador };
        this.filterAndCalculateExpenses();
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/expenses/${expenseData.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(expenseData),
        });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. Tu cambio se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo actualizar el gasto.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.filterAndCalculateExpenses();
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        }
    }

    async confirmDelete(type, id) {
        const alert = document.createElement('ion-alert');
        alert.header = 'Confirmar eliminación';
        alert.message = `¿Estás seguro de que quieres eliminar est${type === 'person'
            ? 'a persona'
            : 'e gasto'}? Esta acción no se puede deshacer.`;
        alert.buttons = [
            {
                text: 'Cancelar',
                role: 'cancel'
            }, {
                text: 'Eliminar',
                handler: () => {
                    if (type === 'person') 
                        this.deletePerson(id);
                    else 
                        this.deleteExpense(id);
                    }
                }
        ];
        document
            .body
            .appendChild(alert);
        await alert.present();
    }

    async deletePerson(personId) {
        const originalGroup = { ...this.group };
        const updatedPeople = this.group.people.filter(p => p.id !== personId);
        const updatedGroup = { ...this.group, people: updatedPeople };

        this.group = updatedGroup;
        this.calculateDebts();
        this.filterAndCalculateExpenses();

        await updateGroupInCache(this._uuid, updatedGroup);

        try {
            const endpoint = await getPushSubscriptionEndpoint();
            const headers = { 'Content-Type': 'application/json' };
            if (endpoint) {
                headers['X-Client-Endpoint'] = endpoint;
            }

            const response = await fetch(`/api/groups/${this._uuid}/people/${personId}`, { method: 'DELETE', headers });

            if (response.status === 202) {
                this.presentToast('Estás sin conexión. La eliminación se sincronizará más tarde.');
            } else if (!response.ok) {
                throw new Error((await response.json()).error || 'No se pudo eliminar la persona.');
            } else {
                this.presentToast('Persona eliminada correctamente.');
            }
        } catch (error) {
            this.presentToast(error.message, 'danger');
            this.group = originalGroup;
            this.calculateDebts();
            this.filterAndCalculateExpenses();
            await updateGroupInCache(this._uuid, originalGroup);
        }
    }

    async deleteExpense(expenseId) {
        const originalGroup = JSON.parse(JSON.stringify(this.group));
        const expenseIndex = this.group.expenses.findIndex(e => e.id === expenseId);
        if (expenseIndex > -1) {
            this.group.expenses.splice(expenseIndex, 1);
        }
        this.calculateDebts();
        this.filterAndCalculateExpenses();
        this.requestUpdate();

        await updateGroupInCache(this._uuid, this.group);

        const endpoint = await getPushSubscriptionEndpoint();
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint) headers['X-Client-Endpoint'] = endpoint;

        const response = await fetch(`/api/groups/${this._uuid}/expenses/${expenseId}`, { method: 'DELETE', headers });

        if (response.status === 202) {
            this.presentToast('Estás sin conexión. La eliminación se sincronizará más tarde.');
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'No se pudo eliminar el gasto.' }));
            this.presentToast(errorData.error, 'danger');
            this.group = originalGroup;
            this.calculateDebts();
            this.filterAndCalculateExpenses();
            this.requestUpdate();
            await updateGroupInCache(this._uuid, originalGroup);
        } else {
            this.presentToast('Gasto eliminado correctamente.');
        }
    }

    calculateDebts() {
        const {people, expenses} = this.group;
        if (people.length === 0 || expenses.length === 0) {
            this.debts = [];
            return;
        }

        const balances = people.reduce((acc, person) => {
            acc[person.name] = 0;
            return acc;
        }, {});

        expenses.forEach(expense => {
            if (balances[expense.pagador] !== undefined) {
                balances[expense.pagador] += expense.amount;
            }
            const share = expense.amount / people.length;
            people.forEach(person => {
                if (balances[person.name] !== undefined) {
                    balances[person.name] -= share;
                }
            });
        });

        const debtors = [];
        const creditors = [];
        for (const person in balances) {
            if (balances[person] > 0) {
                creditors.push({person, amount: balances[person]});
            } else if (balances[person] < 0) {
                debtors.push({
                    person,
                    amount: -balances[person]
                });
            }
        }

        const debts = [];
        let i = 0,
            j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const amount = Math.min(debtor.amount, creditor.amount);

            if (amount > 0.01) { // Umbral para evitar deudas muy pequeñas
                debts.push({from: debtor.person, to: creditor.person, amount});
            }

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.01) 
                i++;
            if (creditor.amount < 0.01) 
                j++;
            }
        this.debts = debts;
    }

    async shareGroup() {
        const shareData = {
            title: `Únete a mi grupo: ${this.group.name}`,
            text: `Usa este código para unirte al grupo y dividir gastos: ${this._uuid}`,
            url: `${window.location.origin}?join=${this._uuid}`
        };

        // La API Web Share es la preferida
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                // No mostrar error si el usuario simplemente cierra el diálogo de compartir
                if (error.name !== 'AbortError') {
                    console.error('Error al usar Web Share API:', error);
                    this.presentToast('Ocurrió un error al intentar compartir.', 'danger');
                }
            }
        } else if (navigator.clipboard && window.isSecureContext) {
            // Fallback: copiar al portapapeles si el contexto es seguro
            try {
                await navigator
                    .clipboard
                    .writeText(`${shareData.text}\n${shareData.url}`);
                this.presentToast('¡Enlace de invitación copiado al portapapeles!', 'success');
            } catch (error) {
                console.error('Error al copiar al portapapeles:', error);
                // Si falla el portapapeles, mostrar el alerta manual
                this.showManualCopyAlert(shareData.text, shareData.url);
            }
        } else {
            // Fallback final: mostrar un alerta para que el usuario copie manualmente
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
        document
            .body
            .appendChild(alert);
        await alert.present();
    }

    async presentToast(message, color = 'primary') {
        const toast = document.createElement('ion-toast');
        toast.message = message;
        toast.duration = 3000;
        toast.color = color;
        toast.position = 'top';
        document
            .body
            .appendChild(toast);
        await toast.present();
    }

    
}

customElements.define('group-view', GroupView);