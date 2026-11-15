import { AppCatalogItem, StoreProductItem } from '../types/analytics';

export const HERO_IMAGE_URL = '/src/assets/images/hero_vitrine_apps_1794721482341.jpg';

export const APP_CATALOG: AppCatalogItem[] = [
  {
    id: 'barbearia',
    trackingId: 'VAA-BARB-01',
    name: 'Aplicativo de Barbearia',
    clientBusinessName: 'Barbearia Navalha de Ouro',
    category: 'Beleza e Estética',
    tagline: 'Agenda inteligente, clube de assinatura e vitrine de produtos.',
    description:
      'Aplicativo completo para barbearias modernas com agendamento por profissional, lembrete automático no WhatsApp e pacote de corte mensal.',
    price: 150.0,
    imageUrl: '/src/assets/images/app_barbearia_preview_1794721482463.jpg',
    features: [
      'Agendamento Online',
      'Seleção de Barbeiro',
      'Clube de Assinatura',
      'Catálogo de Pomadas',
    ],
    popularProducts: ['Aplicativo de Barbearia Pro (APK + Painel)', 'Módulo Clube VIP'],
    clientPortalEnabled: true,
  },
  {
    id: 'confeitaria',
    trackingId: 'VAA-CONF-03',
    name: 'Aplicativo de Confeiteira(o)',
    clientBusinessName: 'Confeitaria Doce Encanto',
    category: 'Alimentação',
    tagline: 'Encomendas personalizadas de bolos, cardápio diário e cálculo de entrega.',
    description:
      'Vitrine interativa para confeiteiras e confeiteiros artesanais com montagem de bolos sob encomenda, carrinho direto e envio do pedido estruturado.',
    price: 150.0,
    imageUrl: '/src/assets/images/app_confeitaria_preview_1794721482653.jpg',
    features: [
      'Encomenda Sob Medida',
      'Cardápio Pronta Entrega',
      'Cálculo de Frete Local',
      'Checkout WhatsApp',
    ],
    popularProducts: ['Aplicativo de Confeiteira(o) Delivery', 'Construtor de Bolos'],
    clientPortalEnabled: true,
  },
  {
    id: 'kit-papelaria',
    trackingId: 'VAA-PAPEL-07',
    name: 'Aplicativo Kit Papelaria',
    clientBusinessName: 'Ateliê Papel & Encanto',
    category: 'Papelaria',
    tagline: 'Catálogo de kits escolares, papelaria personalizada e orçamento por tema.',
    description:
      'Desenvolvido para papelarias criativas e ateliês com escolha de tema, personalização de nome/etiquetas, tabela de kits e envio de pedido completo.',
    price: 150.0,
    imageUrl: '/src/assets/images/app_papelaria_preview_1794722585930.jpg',
    features: [
      'Montagem de Kits por Tema',
      'Personalização de Nome e Etiquetas',
      'Catálogo Volta às Aulas',
      'Orçamento Rápido WhatsApp',
    ],
    popularProducts: ['Aplicativo Kit Papelaria Completo', 'Módulo Etiquetas Personalizadas'],
    clientPortalEnabled: true,
  },
  {
    id: 'salao-beleza',
    trackingId: 'VAA-SALAO-02',
    name: 'Aplicativo de Salão de Beleza',
    clientBusinessName: 'Studio Lumière Beleza',
    category: 'Beleza e Estética',
    tagline: 'Catálogo visual de procedimentos, combos e fidelidade digital.',
    description:
      'Desenvolvido para salões de beleza e clínicas estéticas gerenciarem horários, combos promocionais e histórico de atendimento.',
    price: 150.0,
    imageUrl: '/src/assets/images/app_salao_preview_1794721482894.jpg',
    features: [
      'Catálogo de Procedimentos',
      'Reserva por Horário',
      'Cartão Fidelidade',
      'Galeria Antes e Depois',
    ],
    popularProducts: ['Aplicativo de Salão de Beleza Completo', 'Integração Agenda WhatsApp'],
    clientPortalEnabled: true,
  },
  {
    id: 'estudio-unhas',
    trackingId: 'VAA-UNHA-04',
    name: 'Aplicativo de Estúdio de Unhas',
    clientBusinessName: 'Atelier Nail Design',
    category: 'Beleza e Estética',
    tagline: 'Portfólio por técnica, tabela de manutenção e reserva rápida.',
    description:
      'Feito sob medida para nail designers com exibição de técnicas em gel, fibra e blindagem, além de lembrete de manutenção.',
    price: 150.0,
    imageUrl: '/src/assets/images/app_unhas_preview_1794721483306.jpg',
    features: [
      'Portfólio Nail Art',
      'Tabela de Manutenção',
      'Agendamento Express',
      'Cupom Primeira Visita',
    ],
    popularProducts: ['Aplicativo de Estúdio de Unhas', 'Pacote Identidade Visual'],
    clientPortalEnabled: false,
  },
  {
    id: 'pet-shop',
    trackingId: 'VAA-PET-05',
    name: 'Aplicativo de Pet Shop & Banho',
    clientBusinessName: 'Villa Pet Cuidados',
    category: 'Serviços Locais',
    tagline: 'Agendamento de banho e tosa, rastreio de status e loja de rações.',
    description:
      'Aplicativo completo para pet shops com status do banho em tempo real, carteira de vacinação digital e recompra rápida.',
    price: 150.0,
    imageUrl: '/src/assets/images/hero_vitrine_apps_1794721482341.jpg',
    features: [
      'Agendamento Banho e Tosa',
      'Status do Atendimento',
      'Loja de Ração e Acessórios',
      'Carteira de Vacinas',
    ],
    popularProducts: ['Aplicativo de Pet Shop & Banho Pro', 'Módulo Carteira Pet'],
    clientPortalEnabled: true,
  },
];

export const STORE_ADDONS: StoreProductItem[] = [
  {
    id: 'addon-dominio',
    name: 'Criação e Instalação de Domínio',
    category: 'Domínio',
    price: 100.0,
    summary: 'Registro, apontamento DNS, certificado SSL e instalação completa de domínio personalizado.',
  },
  {
    id: 'addon-identidade',
    name: 'Pacote Identidade Visual & Ícone APK',
    category: 'Personalização',
    price: 100.0,
    summary: 'Adaptação completa de logotipo, paleta de cores e splash screen para publicação.',
  },
  {
    id: 'addon-whatsapp',
    name: 'Módulo Agendamento & Notificação WhatsApp',
    category: 'Integração',
    price: 100.0,
    summary: 'Envio automático de confirmações e resumos de pedido formatados para o atendimento.',
  },
];
