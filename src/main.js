// CSS imports
import './css/base.css';
import './css/layout.css';
import './css/components.css';
import './css/dashboard.css';

// Core modules
import './js/config.js';
import './js/api.js';
import './js/state.js';
import './js/utils.js';
import './js/auth.js';
import './js/app.js';

// Feature modules
import './js/dashboard.js';
import './js/contratos.js';
import './js/localidades.js';
import './js/centros.js';
import './js/veiculos.js';
import './js/movimentacao.js';
import './js/abastecimento.js';
import './js/manutencao.js';
import './js/multas.js';
import './js/vendas.js';
import './js/checklist_desk.js';
import './js/relatorios.js';
import './js/exportacao.js';
import './js/importacao.js';
import './js/usuarios.js';
import './js/notificacoes.js';

// Boot — wait for DOM then initialize drag-and-drop and app
document.addEventListener('DOMContentLoaded', () => {
  if(typeof window.initImportacaoDragDrop === 'function'){
    window.initImportacaoDragDrop();
  }
  if(typeof window.initApp === 'function'){
    window.initApp();
  }
});
