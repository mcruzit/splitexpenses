import Navigo from 'https://cdn.jsdelivr.net/npm/navigo@8.11.1/+esm';
import './components/welcome-view.js';
import './components/group-view.js';
import './components/add-person-view.js';
import './components/add-expense-view.js';
import './components/edit-person-view.js';
import './components/edit-expense-view.js';
import './components/config-view.js';

const router = new Navigo('/');
const app = document.getElementById('app');

router.on('/', ({ params }) => {
  const welcomeView = document.createElement('welcome-view');
  welcomeView._router = router;
  app.innerHTML = '';
  app.appendChild(welcomeView);

  // Si la URL contiene un parámetro 'join', intentar unirse al grupo automáticamente
  if (params && params.join) {
    // Eliminar el parámetro de la URL para no volver a procesarlo si el usuario vuelve atrás
    router.navigate('/', { historyAPIMethod: 'replaceState' });
    welcomeView.joinGroup(params.join);
  }
});

router.on('/group/:uuid', ({ data }) => {
  const groupView = document.createElement('group-view');
  groupView._router = router;
  groupView._uuid = data.uuid;
  app.innerHTML = '';
  app.appendChild(groupView);
});

router.on('/config', () => {
  const configView = document.createElement('config-view');
  configView._router = router;
  app.innerHTML = '';
  app.appendChild(configView);
});

export default router;
