import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '@/stores/auth'
import { rejimStore, type Rejim } from '@/stores/rejim'

/* meta.faqat — sahifa faqat shu biznes rejimida ochiladi (stores/rejim.ts).
   D — distributsiyaga xos: agent, dostavchik, buyurtma zanjiri, Van Sell. */
const D = { faqat: 'distributsiya' as Rejim }

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../pages/login/index.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/MainLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard',        name: 'Dashboard',        meta: { module: 'dashboard' },        component: () => import('../pages/dashboard/index.vue') },
        { path: 'supervayzer',      name: 'Supervayzer',      meta: { module: 'supervayzer', ...D },      component: () => import('../pages/supervayzer/index.vue') },

        /* ── Agentlar bo'limi ──────────────────────────────────────
           Agentga oid barcha sahifa shu bo'lim ostida. Eski yo'llar
           (hisobot/agent-*) pastda yangisiga redirect qilinadi. */
        { path: 'agentlar',           redirect: '/agentlar/nazorat' },
        { path: 'agentlar/nazorat',   name: 'AgentNazorat',  meta: { module: 'supervayzer', ...D }, component: () => import('../pages/hisobot/agent-monitoring.vue') },
        { path: 'agentlar/online',    name: 'AgentOnline',   meta: { module: 'supervayzer', ...D }, component: () => import('../pages/hisobot/agent-online.vue') },
        { path: 'agentlar/royxat',    name: 'AgentRoyxat',   meta: { module: 'supervayzer', ...D }, component: () => import('../pages/supervayzer/index.vue') },
        { path: 'agentlar/plan',      name: 'AgentPlan',     meta: { module: 'supervayzer', ...D }, component: () => import('../pages/hisobot/agentlar.vue') },
        { path: 'agentlar/marshrut',  name: 'AgentMarshrutReja', meta: { module: 'supervayzer', ...D }, component: () => import('../pages/hisobot/reja.vue') },
        { path: 'agentlar/mobil',     name: 'AgentMobil',    meta: { module: 'supervayzer', ...D }, component: () => import('../pages/hisobot/mobil.vue') },
        { path: 'sotuvlar',              name: 'Sotuvlar',          meta: { module: 'sotuvlar', ...D }, redirect: '/sotuvlar/buyurtmalar' },
        { path: 'sotuvlar/buyurtmalar',  name: 'SotuvlarBuyurtmalar', meta: { module: 'sotuvlar', ...D }, component: () => import('../pages/sotuvlar/buyurtmalar.vue') },
        { path: 'sotuvlar/arizalar',     name: 'SotuvlarArizalar',    meta: { module: 'sotuvlar', ...D }, component: () => import('../pages/sotuvlar/index.vue') },
        { path: 'sotuvlar/hisobot',      name: 'SotuvlarHisobot',     meta: { module: 'sotuvlar', ...D }, component: () => import('../pages/hisobot/sotuv.vue') },
        { path: 'sotuvlar/dostavchilar', name: 'SotuvlarDostavchilar',meta: { module: 'sotuvlar', ...D }, component: () => import('../pages/dostavchilar/index.vue') },
        { path: 'sotuvlar/trip-sheet',   name: 'SotuvlarTripSheet',   meta: { module: 'sotuvlar', ...D }, component: () => import('../pages/dostavchilar/tripSheet.vue') },
        { path: 'sotuvlar/qaytarish',    name: 'SotuvlarQaytarish',   meta: { module: 'sotuvlar', ...D }, component: () => import('../pages/dostavchilar/qaytarish.vue') },
        // Avtolavka — butun jarayon bitta markazda (yuklash, savdo, qabul, kassa, solishtirma)
        { path: 'avtolavka',             name: 'Avtolavka',            meta: { module: 'avtolavka', ...D }, component: () => import('../pages/avtolavka/index.vue') },
        { path: 'avtolavka/sotuvlar',    name: 'AvtolavkaSotuvlar',    meta: { module: 'avtolavka', ...D }, component: () => import('../pages/avtolavka/sotuvlar.vue') },
        { path: 'avtolavka/sotuv',       name: 'AvtolavkaSotuv',       meta: { module: 'avtolavka', ...D }, component: () => import('../pages/avtolavka/sotuv.vue') },
        { path: 'avtolavka/:eski(yuklash|qabul|solishtirma)', redirect: '/avtolavka' },
        // Optom — mijozga skladdan sotish va sotuvlar jurnali (agent / mashina yo'q)
        { path: 'sotuv',                 name: 'OptomSotuv',           meta: { module: 'sotuvlar', faqat: 'optom' }, component: () => import('../pages/avtolavka/sotuv.vue') },
        { path: 'sotuv/jurnal',          name: 'OptomSotuvlar',        meta: { module: 'sotuvlar', faqat: 'optom' }, component: () => import('../pages/avtolavka/sotuvlar.vue') },
        { path: 'mijozlar',         name: 'Mijozlar',         meta: { module: 'mijozlar' },         component: () => import('../pages/mijozlar/index.vue') },
        { path: 'mijozlar/xarita',  name: 'MijozlarXarita',   meta: { module: 'mijozlar', ...D },         component: () => import('../pages/mijozlar/xarita.vue') },
        { path: 'mijozlar/oldi-berdi', name: 'MijozlarOldiBerdi', meta: { module: 'mijozlar' },    component: () => import('../pages/mijozlar/oldi-berdi.vue') },
        { path: 'moliya',           name: 'Moliya',           meta: { module: 'moliya' },           component: () => import('../pages/moliyalar/index.vue') },
        { path: 'moliya/xarajatlar', name: 'MoliyaXarajatlar', meta: { module: 'moliya' },          component: () => import('../pages/moliyalar/xarajatlar.vue') },
        { path: 'moliya/qarzlar',   name: 'MoliyaQarzlar',    meta: { module: 'moliya' },           component: () => import('../pages/moliyalar/qarzlar.vue') },
        { path: 'ombor',              name: 'Ombor',            meta: { module: 'ombor' },            component: () => import('../pages/ombor/index.vue') },
        { path: 'ombor/prixod',     name: 'Prixod',           meta: { module: 'ombor' },            component: () => import('../pages/ombor/prixod/index.vue') },
        { path: 'ombor/prixod/:id', name: 'PrixodForm',       meta: { module: 'ombor' },            component: () => import('../pages/ombor/prixod/form.vue') },
        { path: 'ombor/qoldiqlar',  name: 'OmborQoldiqlar',   meta: { module: 'ombor' },            component: () => import('../pages/ombor/qoldiqlar.vue') },
        { path: 'ombor/partiya',    name: 'OmborPartiya',     meta: { module: 'ombor' },            component: () => import('../pages/ombor/partiya.vue') },
        { path: 'ombor/yigish',     name: 'OmborYigish',      meta: { module: 'ombor', ...D },            component: () => import('../pages/ombor/yigish.vue') },
        { path: 'ombor/qaytarish-qabul', name: 'OmborQaytarishQabul', meta: { module: 'ombor', ...D }, component: () => import('../pages/ombor/qaytarish-qabul.vue') },
        { path: 'ishlab',           name: 'Ishlab',           meta: { module: 'ishlab' },           component: () => import('../pages/ishlab/index.vue') },
        { path: 'ishlab/:id',       name: 'IshlabForm',       meta: { module: 'ishlab' },           component: () => import('../pages/ishlab/form.vue') },
        { path: 'yetkazuvchilar',     name: 'Yetkazuvchilar',     meta: { module: 'ombor' },   component: () => import('../pages/yetkazuvchilar/index.vue') },
        { path: 'yetkazuvchilar/:id', name: 'YetkazuvchiDetail', meta: { module: 'ombor' },   component: () => import('../pages/yetkazuvchilar/detail.vue') },
        { path: 'hisobot',          name: 'Hisobot',          meta: { module: 'hisobot' },          component: () => import('../pages/hisobot/index.vue') },
        { path: 'hisobot/biznes',   name: 'HisobotBiznes',   meta: { module: 'hisobot' },          component: () => import('../pages/hisobot/biznes.vue') },
        { path: 'hisobot/sotuv',    name: 'HisobotSotuv',    meta: { module: 'hisobot' },          component: () => import('../pages/hisobot/sotuv.vue') },
        { path: 'hisobot/qarzlar',  name: 'HisobotQarzlar',  meta: { module: 'hisobot' },          component: () => import('../pages/hisobot/qarzlar.vue') },
        { path: 'hisobot/kirim',    name: 'HisobotKirim',    meta: { module: 'hisobot' },          component: () => import('../pages/hisobot/kirim.vue') },
        { path: 'hisobot/tovarlar', name: 'HisobotTovarlar', meta: { module: 'hisobot' },          component: () => import('../pages/hisobot/tovarlar.vue') },
        { path: 'hisobot/ombor',    name: 'HisobotOmbor',    meta: { module: 'hisobot' },          component: () => import('../pages/hisobot/ombor.vue') },
        { path: 'hisobot/register',       name: 'HisobotRegister',       meta: { module: 'hisobot' }, component: () => import('../pages/hisobot/register.vue') },
        { path: 'hisobot/yetkazuvchilar', name: 'HisobotYetkazuvchilar', meta: { module: 'hisobot' }, component: () => import('../pages/hisobot/yetkazuvchilar.vue') },
        { path: 'hisobot/agentlar',      redirect: '/agentlar/plan' },
        { path: 'hisobot/agent-nazorat', redirect: '/agentlar/nazorat' },
        { path: 'hisobot/mobil',         redirect: '/agentlar/mobil' },
        { path: 'hisobot/reyting',        name: 'HisobotReyting',        meta: { module: 'hisobot', ...D }, component: () => import('../pages/hisobot/reyting.vue') },
        { path: 'hisobot/xodim',          name: 'HisobotXodim',          meta: { module: 'hisobot', ...D }, component: () => import('../pages/hisobot/xodim.vue') },
        { path: 'hisobot/inkassatsiya',   name: 'HisobotInkassatsiya',   meta: { module: 'hisobot', ...D }, component: () => import('../pages/hisobot/inkassatsiya.vue') },
        { path: 'hisobot/reja',          redirect: '/agentlar/marshrut' },
        { path: 'sozlamalar',       name: 'Sozlamalar',       meta: { module: 'sozlamalar' },       component: () => import('../pages/sozlamalar/index.vue') },
        { path: 'foydalanuvchilar', name: 'Foydalanuvchilar', meta: { module: 'foydalanuvchilar' }, component: () => import('../pages/foydalanuvchilar/index.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const loggedIn = authStore.isLoggedIn.value

  // Login sahifasi
  if (to.meta.public) {
    if (loggedIn) return { path: '/dashboard' }
    return
  }

  // Login qilinmagan
  if (!loggedIn) return { name: 'Login' }

  // Bu biznes rejimida yo'q sahifa (masalan, optomda agent yoki Van Sell sahifasi)
  if (!rejimStore.mos(to.meta.faqat as Rejim | undefined)) return { path: '/dashboard' }

  // Modulga ruxsat tekshiruvi
  const module = to.meta.module as string | undefined
  if (module && !authStore.canView(module)) {
    // Ruxsati bor birinchi modulni topib u yerga yo'naltiramiz
    const user = authStore.state.user
    if (user?.role === 'Admin' || user?.role === 'Programmer') return

    const perms = user?.perms
    if (!perms) return { path: '/login' }

    const modules = rejimStore.isOptom.value
      ? ['dashboard','sotuvlar','mijozlar','moliya','ombor','hisobot','foydalanuvchilar','sozlamalar']
      : ['dashboard','supervayzer','sotuvlar','mijozlar','moliya','ombor','hisobot','foydalanuvchilar','sozlamalar']
    // Optomda "sotuvlar" ruxsati skladdan sotish sahifasini ochadi (buyurtma zanjiri yo'q)
    const yol = (m: string) => (m === 'sotuvlar' && rejimStore.isOptom.value ? '/sotuv' : `/${m}`)
    for (const m of modules) {
      if (Array.isArray(perms[m]) && perms[m].includes('view')) {
        return { path: yol(m) }
      }
    }
    // Hech qanday ruxsat yo'q — logout
    authStore.logout()
    return { name: 'Login' }
  }
})

export default router
