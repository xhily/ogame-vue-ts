import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'overview', component: () => import('@/views/OverviewView.vue') },
    { path: '/buildings', name: 'buildings', component: () => import('@/views/BuildingsView.vue') },
    { path: '/research', name: 'research', component: () => import('@/views/ResearchView.vue') },
    { path: '/shipyard', name: 'shipyard', component: () => import('@/views/ShipyardView.vue') },
    { path: '/defense', name: 'defense', component: () => import('@/views/DefenseView.vue') },
    { path: '/fleet', name: 'fleet', component: () => import('@/views/FleetView.vue') },
    { path: '/officers', name: 'officers', component: () => import('@/views/OfficersView.vue') },
    { path: '/battle-simulator', name: 'battle-simulator', component: () => import('@/views/BattleSimulatorView.vue') },
    { path: '/messages', name: 'messages', component: () => import('@/views/MessagesView.vue') },
    { path: '/galaxy', name: 'galaxy', component: () => import('@/views/GalaxyView.vue') },
    { path: '/diplomacy', name: 'diplomacy', component: () => import('@/views/DiplomacyView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/gm', name: 'gm', component: () => import('@/views/GMView.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') }
  ]
})

export default router
