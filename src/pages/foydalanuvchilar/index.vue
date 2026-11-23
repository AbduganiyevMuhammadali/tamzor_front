<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { api } from '@/api/api.js'
import NumberInput from '@/components/NumberInput.vue'
import { authStore } from '@/stores/auth'
import { rejimStore } from '@/stores/rejim'
import { useForma } from '@/validation/useForma'
import * as sx from '@/validation/sxemalar'

// ── SVG paths ────────────────────────────────────────────
const SVG = {
  ishlab:      `<path d="M2 17V8.5l4.5 3v-3l4.5 3V5l5 2.5V17H2z"/>`,
  eye:         `<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10z" clip-rule="evenodd"/>`,
  plus:        `<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>`,
  edit:        `<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>`,
  trash:       `<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>`,
  export:      `<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>`,
  check:       `<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>`,
  map:         `<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>`,
  manage:      `<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>`,
  approve:     `<path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>`,
  dashboard:   `<path d="M2 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V4zM2 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z"/>`,
  supervayzer: `<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h3a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h3a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>`,
  sotuvlar:    `<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>`,
  mijozlar:    `<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM9 12a5 5 0 00-10 0v1h10v-1zm8 0a5 5 0 00-10 0v1h10v-1z"/>`,
  moliya:      `<path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/>`,
  ombor:       `<path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"/>`,
  users_mgmt:  `<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>`,
  sozlamalar:  `<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>`,
  hisobotlar:  `<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>`,
  ban:         `<path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>`,
  shield:      `<path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>`,
  clock:       `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>`,
  location:    `<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>`,
  search:      `<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>`,
  avtolavka:   `<path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>`,
  users_add:   `<path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>`,
  lock:        `<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>`,
  close:       `<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>`,
  chevron_r:   `<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>`,
  refresh:     `<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>`,
}

// ── Modullar ─────────────────────────────────────────────
// faqat — modul faqat shu biznes rejimida ruxsatlar jadvalida ko'rinadi (stores/rejim.ts)
const BARCHA_MODULLAR = [
  { module:'dashboard',        label:'Bosh sahifa',     svgPath:SVG.dashboard,   color:'#a78bfa',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye }] },
  { module:'supervayzer',      label:'Agentlar',        svgPath:SVG.supervayzer, color:'#34d399', faqat:'distributsiya',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'manage',  label:'Boshqarish', svgPath:SVG.manage }] },
  { module:'sotuvlar',         label:'Sotuvlar',        svgPath:SVG.sotuvlar,    color:'#a78bfa', faqat:'optom',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'create',  label:'Yaratish',   svgPath:SVG.plus },
             { key:'edit',    label:'Tahrirlash', svgPath:SVG.edit },
             { key:'delete',  label:"O'chirish",  svgPath:SVG.trash },
             { key:'export',  label:'Eksport',    svgPath:SVG.export }] },
  { module:'ishlab',           label:'Ishlab chiqarish', svgPath:SVG.ishlab,     color:'#a78bfa',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'create',  label:'Yaratish',   svgPath:SVG.plus },
             { key:'approve', label:'Yakunlash',  svgPath:SVG.approve }] },
  { module:'avtolavka',        label:'Van Sell',       svgPath:SVG.avtolavka,   color:'#fb923c', faqat:'distributsiya',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'create',  label:'Yaratish',   svgPath:SVG.plus },
             { key:'approve', label:'Tasdiqlash', svgPath:SVG.approve }] },
  { module:'mijozlar',         label:'Mijozlar',        svgPath:SVG.mijozlar,    color:'#a78bfa',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'create',  label:'Yaratish',   svgPath:SVG.plus },
             { key:'edit',    label:'Tahrirlash', svgPath:SVG.edit },
             { key:'delete',  label:"O'chirish",  svgPath:SVG.trash },
             { key:'map',     label:'Xarita',     svgPath:SVG.map }] },
  { module:'moliya',           label:'Moliya',          svgPath:SVG.moliya,      color:'#fbbf24',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'create',  label:'Yaratish',   svgPath:SVG.plus },
             { key:'approve', label:'Tasdiqlash', svgPath:SVG.approve },
             { key:'export',  label:'Eksport',    svgPath:SVG.export }] },
  { module:'ombor',            label:'Ombor',           svgPath:SVG.ombor,       color:'#a78bfa',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'create',  label:'Yaratish',   svgPath:SVG.plus },
             { key:'edit',    label:'Tahrirlash', svgPath:SVG.edit },
             { key:'delete',  label:"O'chirish",  svgPath:SVG.trash }] },
  { module:'foydalanuvchilar', label:'Foydalanuvchilar',svgPath:SVG.users_mgmt,  color:'#8b5cf6',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'create',  label:'Yaratish',   svgPath:SVG.plus },
             { key:'edit',    label:'Tahrirlash', svgPath:SVG.edit },
             { key:'delete',  label:"O'chirish",  svgPath:SVG.trash }] },
  { module:'sozlamalar',       label:'Sozlamalar',      svgPath:SVG.sozlamalar,  color:'#94a3b8',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'edit',    label:'Tahrirlash', svgPath:SVG.edit }] },
  { module:'hisobotlar',       label:'Hisobotlar',      svgPath:SVG.hisobotlar,  color:'#8b5cf6',
    actions:[{ key:'view',    label:"Ko'rish",    svgPath:SVG.eye },
             { key:'export',  label:'Eksport',    svgPath:SVG.export }] },
]

const MODULES     = BARCHA_MODULLAR.filter(m => rejimStore.mos(m.faqat))
const MOD_MAP     = Object.fromEntries(MODULES.map(m => [m.module, m]))
const ROLE_COLORS = ['#7c3aed','#059669','#d97706','#dc2626','#8b5cf6','#6d28d9','#a78bfa','#5b21b6']

// ── Rollar (local — backendda rol jadvali yo'q) ───────────
const roles = ref([
  { id:'r1', name:'Super Admin', color:'#ef4444', description:"Tizimning to'liq nazorati", isSystem:true, userCount:1,
    perms: Object.fromEntries(MODULES.map(m => [m.module, m.actions.map(a => a.key)])) },
  { id:'r2', name:'Menejer',     color:'#8b5cf6', description:'Savdo va mijozlarni boshqarish', userCount:3,
    perms:{ dashboard:['view'], supervayzer:['view','manage'], sotuvlar:['view','create','edit','export'], mijozlar:['view','create','edit','map'], moliya:['view'], ombor:['view'], foydalanuvchilar:[], sozlamalar:[], hisobotlar:['view','export'] } },
  { id:'r4', name:'Kassir',      color:'#f59e0b', description:'Moliyaviy operatsiyalar', userCount:2,
    perms:{ dashboard:['view'], supervayzer:[], sotuvlar:['view'], mijozlar:['view'], moliya:['view','create','approve'], ombor:['view'], foydalanuvchilar:[], sozlamalar:[], hisobotlar:['view','export'] } },
  { id:'r5', name:'Omborchi',    color:'#8b5cf6', description:'Ombor va inventar boshqaruvi', userCount:2,
    perms:{ dashboard:['view'], supervayzer:[], sotuvlar:['view'], mijozlar:[], moliya:[], ombor:['view','create','edit','delete'], foydalanuvchilar:[], sozlamalar:[], hisobotlar:['view'] } },
])

// ── Foydalanuvchilar (backend dan) ────────────────────────
const users      = ref([])
const loading    = ref(false)
const apiError   = ref('')

// Backend rollar (backendda faqat shu 3 ta rol bor)
const BACKEND_ROLES = [
  { value: 'Admin',       label: 'Admin',       color: '#ef4444' },
  { value: 'Programmer',  label: 'Programmer',  color: '#8b5cf6' },
  { value: 'User',        label: 'User',        color: '#10b981' },
]
const BACKEND_ROLE_COLOR = Object.fromEntries(BACKEND_ROLES.map(r => [r.value, r.color]))

// Backend { id, username, fullname, role } → frontend { id, name, username, role, active, lastLogin }
function fromBackend(u) {
  return {
    id:        String(u.id),
    name:      u.fullname || u.username,
    username:  u.username,
    role:      u.role,          // 'Admin' | 'User' | 'Programmer'
    active:    true,            // backendda faollik maydoni yo'q
    lastLogin: u.updatedAt ? new Date(u.updatedAt).toLocaleString('uz-UZ') : '—',
    region:    '',
    perms:     u.perms || null,
    xarajatLimit: u.xarajat_limit == null ? null : Number(u.xarajat_limit),
  }
}

async function fetchUsers() {
  loading.value = true
  apiError.value = ''
  try {
    const data = await api.get('/users')
    users.value = Array.isArray(data) ? data.map(fromBackend) : []
  } catch (e) {
    apiError.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)

// ── UI state ──────────────────────────────────────────────
const activeTab    = ref('users')
const modalMode    = ref(null)
const searchQ      = ref('')
const filterRole   = ref('')
const filterActive = ref('')

// ── User form ─────────────────────────────────────────────
const emptyUserForm = () => ({
  id: '', name: '', username: '', password: '', confirmPassword: '',
  role: 'User', active: true, region: '', xarajatLimit: ''
})
// Rol, ruxsatlar va xarajat limitini faqat Admin o'zgartiradi (backend boshqalarga 403 beradi)
const adminmi = computed(() => authStore.state.user?.role === 'Admin')
const userForm      = ref(emptyUserForm())
const userFormError = ref('')
const userSaving    = ref(false)
const editUserId    = ref(null)
// Backend maydon nomlari: name → fullname. Yangi foydalanuvchida parol majburiy.
const uf = useForma(
  { ...sx.foydalanuvchi, password: { ...sx.foydalanuvchi.password } },
  () => ({ username: userForm.value.username, fullname: userForm.value.name, role: userForm.value.role, password: userForm.value.password }),
)

const permTab = ref('bolimlar')

function openAddUser() {
  userForm.value = emptyUserForm()
  editUserId.value = null
  userFormError.value = ''
  uf.tozala()
  setPermsUP(null)
  permTab.value = 'bolimlar'
  modalMode.value = 'add-user'
}

function openEditUser(u) {
  userForm.value = {
    id: u.id, name: u.name, username: u.username,
    password: '', confirmPassword: '',
    role: u.role, active: u.active, region: u.region || '',
    xarajatLimit: u.xarajatLimit == null ? '' : u.xarajatLimit
  }
  editUserId.value = u.id
  userFormError.value = ''
  uf.tozala()
  setPermsUP(u.perms)
  permTab.value = 'bolimlar'
  modalMode.value = 'edit-user'
}

async function saveUser() {
  if (userSaving.value) return
  const f = userForm.value
  if (!uf.tekshir()) { userFormError.value = uf.umumiy.value; return }
  if (!editUserId.value && !f.password) { userFormError.value = 'Parol majburiy'; return }
  if (!editUserId.value && !f.confirmPassword) { userFormError.value = 'Parolni tasdiqlang'; return }
  if (f.password && f.password !== f.confirmPassword) {
    userFormError.value = 'Parollar mos emas'; return
  }

  userFormError.value = ''
  userSaving.value = true

  // UP[module][action] = true/false → backend uchun { module: ['action', ...] } formatga o'tkazish
  const permsSnapshot = Object.fromEntries(
    MODULES.map(m => [
      m.module,
      m.actions.filter(a => UP[m.module][a.key]).map(a => a.key)
    ])
  )

  const body = {
    username:        f.username.trim(),
    fullname:        f.name.trim(),
    password:        f.password || '',
    confirmPassword: f.confirmPassword || '',
  }
  // Admin bo'lmagan foydalanuvchi o'z profilini saqlaganda rol, ruxsat va limit yuborilmaydi (aks holda 403)
  if (adminmi.value) {
    body.role = f.role
    body.perms = permsSnapshot
    // Bo'sh — cheklovsiz (null); 0 — har xarajat tasdiqqa. Limit faqat User rolida ma'noga ega
    body.xarajat_limit = f.role !== 'User' || f.xarajatLimit === '' || f.xarajatLimit == null ? null : Number(f.xarajatLimit)
  } else if (!editUserId.value) { body.role = f.role; body.perms = permsSnapshot }

  try {
    if (editUserId.value) {
      await api.patch(`/users/id/${editUserId.value}`, body)
    } else {
      await api.post('/users', body)
    }
    await fetchUsers()
    modalMode.value = null
  } catch (e) {
    userFormError.value = uf.server(e)
  } finally {
    userSaving.value = false
  }
}

async function deleteUser(id) {
  if (!confirm("Foydalanuvchini o'chirishni tasdiqlaysizmi?")) return
  try {
    await api.delete(`/users/id/${id}`)
    users.value = users.value.filter(u => u.id !== id)
  } catch (e) {
    apiError.value = e.message
  }
}

function toggleUserActive(u) { u.active = !u.active }

// ── Permissions ───────────────────────────────────────────
// UP[module][action] = true | false — har bir toggle to'g'ridan-to'g'ri shu qiymatni o'zgartiradi
const UP = reactive(
  Object.fromEntries(MODULES.map(m => [
    m.module,
    Object.fromEntries(m.actions.map(a => [a.key, false]))
  ]))
)

// src: { dashboard: ['view'], sotuvlar: ['view','create'] } yoki null
function setPermsUP(src) {
  MODULES.forEach(m => {
    const granted = (src && Array.isArray(src[m.module])) ? src[m.module] : []
    m.actions.forEach(a => { UP[m.module][a.key] = granted.includes(a.key) })
  })
}

// modLevel: modul qancha ochiq — 'none' | 'partial' | 'full'
function modLevel(module) {
  const actions = MOD_MAP[module].actions
  const n = actions.filter(a => UP[module][a.key]).length
  if (n === 0) return 'none'
  if (n === actions.length) return 'full'
  return 'partial'
}

function hasPerm(module, action) {
  return !!UP[module][action]
}

function toggleUserPerm(module, action) {
  UP[module][action] = !UP[module][action]
  // Action yoqilganda modul avtomatik ochiladi (boshqa action lar o'zgarishsiz qoladi)
  // Action o'chirilganda hech narsa qilmaymiz — foydalanuvchi o'zi hal qiladi
}
function toggleUserModule(module) {
  const isAny = MOD_MAP[module].actions.some(a => UP[module][a.key])
  MOD_MAP[module].actions.forEach(a => { UP[module][a.key] = !isAny })
}
function grantAllUser()  { MODULES.forEach(m => m.actions.forEach(a => { UP[m.module][a.key] = true  })) }
function revokeAllUser() { MODULES.forEach(m => m.actions.forEach(a => { UP[m.module][a.key] = false })) }

// ── Roles CRUD (local) ────────────────────────────────────
const editRoleId   = ref(null)
const selectedMod  = ref(MODULES[0].module)
const copyFromRole = ref('')
const roleForm = reactive({
  name: '', color: ROLE_COLORS[0], description: '',
  perms: Object.fromEntries(MODULES.map(m => [m.module, []]))
})
const roleFormError = ref('')

function openAddRole() {
  editRoleId.value = null; copyFromRole.value = ''
  roleForm.name = ''; roleForm.color = ROLE_COLORS[0]; roleForm.description = ''
  MODULES.forEach(m => { roleForm.perms[m.module] = [] })
  selectedMod.value = MODULES[0].module
  roleFormError.value = ''; modalMode.value = 'add-role'
}
function openEditRole(r) {
  editRoleId.value = r.id; copyFromRole.value = ''
  roleForm.name = r.name; roleForm.color = r.color; roleForm.description = r.description
  MODULES.forEach(m => { roleForm.perms[m.module] = [...(r.perms[m.module] || [])] })
  selectedMod.value = MODULES[0].module
  roleFormError.value = ''; modalMode.value = 'edit-role'
}
function saveRole() {
  if (!roleForm.name.trim()) { roleFormError.value = 'Rol nomi majburiy'; return }
  roleFormError.value = ''
  const perms = Object.fromEntries(MODULES.map(m => [m.module, [...(roleForm.perms[m.module] || [])]]))
  if (editRoleId.value) {
    const idx = roles.value.findIndex(r => r.id === editRoleId.value)
    if (idx !== -1) {
      const old = roles.value[idx]
      roles.value[idx] = { ...old, name:roleForm.name, color:roleForm.color, description:roleForm.description, perms }
    }
  } else {
    roles.value.push({ id:`role_${Date.now()}`, name:roleForm.name, color:roleForm.color, description:roleForm.description, perms, userCount:0 })
  }
  modalMode.value = null
}
function deleteRole(id) {
  if (roles.value.find(r => r.id === id && r.isSystem)) return
  roles.value = roles.value.filter(r => r.id !== id)
}

watch(copyFromRole, id => {
  if (!id) return
  const src = roles.value.find(r => r.id === id)
  if (src) MODULES.forEach(m => { roleForm.perms[m.module] = [...(src.perms[m.module] || [])] })
})

function togglePerm(module, action) {
  const arr = roleForm.perms[module] || []
  const i = arr.indexOf(action)
  i === -1 ? arr.push(action) : arr.splice(i, 1)
}
function toggleModule(module) {
  const m = MOD_MAP[module]
  const arr = roleForm.perms[module] || []
  roleForm.perms[module] = arr.length === m.actions.length ? [] : m.actions.map(a => a.key)
}
function grantAll()  { MODULES.forEach(m => { roleForm.perms[m.module] = m.actions.map(a => a.key) }) }
function revokeAll() { MODULES.forEach(m => { roleForm.perms[m.module] = [] }) }

function moduleAccessLevel(module) {
  const m = MOD_MAP[module]
  const n = (roleForm.perms[module] || []).length
  if (n === 0) return 'none'
  if (n === m.actions.length) return 'full'
  return 'partial'
}

// ── Computed ──────────────────────────────────────────────
const filteredUsers = computed(() => {
  let list = users.value
  if (searchQ.value)     list = list.filter(u => u.name.toLowerCase().includes(searchQ.value.toLowerCase()) || u.username.toLowerCase().includes(searchQ.value.toLowerCase()))
  if (filterRole.value)  list = list.filter(u => u.role === filterRole.value)
  if (filterActive.value)list = list.filter(u => filterActive.value === 'active' ? u.active : !u.active)
  return list
})

const stats = computed(() => ({
  total:   users.value.length,
  active:  users.value.filter(u => u.active).length,
  roles:   roles.value.length,
  offline: users.value.filter(u => !u.active).length,
}))

const selectedUserRole = computed(() => {
  if (!userForm.value.role) return null
  return BACKEND_ROLES.find(r => r.value === userForm.value.role) || null
})

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<template>
  <div class="fu-page">

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="sic" style="background:rgba(139,92,246,.12);color:#a78bfa">
          <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.mijozlar"/>
        </span>
        <div><div class="sv">{{ stats.total }}</div><div class="sl">Jami foydalanuvchi</div></div>
      </div>
      <div class="stat-card">
        <span class="sic" style="background:rgba(16,185,129,.12);color:#10b981">
          <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.check"/>
        </span>
        <div><div class="sv">{{ stats.active }}</div><div class="sl">Faol</div></div>
      </div>
      <div class="stat-card">
        <span class="sic" style="background:rgba(139,92,246,.12);color:#8b5cf6">
          <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.shield"/>
        </span>
        <div><div class="sv">{{ stats.roles }}</div><div class="sl">Rollar</div></div>
      </div>
      <div class="stat-card">
        <span class="sic" style="background:rgba(107,114,128,.1);color:#6b7280">
          <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.ban"/>
        </span>
        <div><div class="sv">{{ stats.offline }}</div><div class="sl">Nofaol</div></div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-bar">
      <div class="tabs-inner">
        <button :class="['tab', activeTab==='users'&&'tab--on']" @click="activeTab='users'">
          <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.mijozlar"/>
          Foydalanuvchilar
          <span class="tab-n">{{ users.length }}</span>
        </button>
        <button :class="['tab', activeTab==='roles'&&'tab--on']" @click="activeTab='roles'">
          <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.lock"/>
          Rollar va ruxsatlar
          <span class="tab-n">{{ roles.length }}</span>
        </button>
      </div>
    </div>

    <!-- ═══ USERS ═══ -->
    <template v-if="activeTab==='users'">

      <!-- Loading / Error -->
      <div v-if="loading" class="api-loading">
        <span class="spin"/>
        Yuklanmoqda...
      </div>
      <div v-if="apiError" class="api-err">
        <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.ban"/>
        {{ apiError }}
        <button @click="fetchUsers">Qayta urinish</button>
      </div>

      <div class="toolbar">
        <div class="tl">
          <label class="srch">
            <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.search"/>
            <input v-model="searchQ" placeholder="Ism yoki email..." class="srch-in"/>
          </label>
          <select v-model="filterRole"   class="flt"><option value="">Barcha rollar</option><option v-for="r in BACKEND_ROLES" :key="r.value" :value="r.value">{{ r.label }}</option></select>
          <select v-model="filterActive" class="flt"><option value="">Hammasi</option><option value="active">Faol</option><option value="inactive">Nofaol</option></select>
        </div>
        <button class="add-btn" @click="openAddUser">
          <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.users_add"/>
          Foydalanuvchi qo'shish
        </button>
      </div>

      <div class="user-grid">
        <div v-for="u in filteredUsers" :key="u.id" class="ucard">

          <!-- Header -->
          <div class="ucard-hd">
            <div class="ucard-av" :style="{background:(BACKEND_ROLE_COLOR[u.role]??'#9ca3af')+'22',color:BACKEND_ROLE_COLOR[u.role]??'#9ca3af'}">
              {{ getInitials(u.name) }}
            </div>
            <div class="ucard-info">
              <div class="ucard-name">{{ u.name }}</div>
              <div class="ucard-email">{{ u.username }}</div>
            </div>
            <span :class="['ucard-dot', u.active?'ucard-dot--on':'ucard-dot--off']"/>
          </div>

          <!-- Role + region -->
          <div class="ucard-meta">
            <span class="role-tag" :style="{background:(BACKEND_ROLE_COLOR[u.role]??'#9ca3af')+'15',color:BACKEND_ROLE_COLOR[u.role]??'#9ca3af',borderColor:(BACKEND_ROLE_COLOR[u.role]??'#9ca3af')+'30'}">
              <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.shield"/>
              {{ u.role ?? '—' }}
            </span>
            <span class="region-tag">
              <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.location"/>
              {{ u.region ?? '—' }}
            </span>
          </div>

          <!-- Module access chips — compact row -->
          <div class="access-bar">
            <span class="ab-label">Rol</span>
            <div class="ab-chips">
              <span class="ab-chip ab-chip--on"
                :style="{background:(BACKEND_ROLE_COLOR[u.role]??'#9ca3af')+'15',borderColor:(BACKEND_ROLE_COLOR[u.role]??'#9ca3af')+'35',color:BACKEND_ROLE_COLOR[u.role]??'#9ca3af',width:'auto',padding:'0 8px',fontSize:'11px',fontWeight:600}">
                {{ u.role }}
              </span>
            </div>
          </div>

          <!-- Last login -->
          <div class="ucard-login">
            <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.clock"/>
            {{ u.lastLogin ?? '—' }}
            <span v-if="u.role === 'User'" class="ucard-limit" :title="u.xarajatLimit == null ? 'Xarajat limiti belgilanmagan' : 'Bitta xarajat limiti'">Limit: {{ u.xarajatLimit == null ? 'cheklovsiz' : Number(u.xarajatLimit).toLocaleString('ru-RU') }}</span>
          </div>

          <!-- Footer actions -->
          <div class="ucard-ft">
            <button class="ua-btn ua-btn--edit" @click="openEditUser(u)">
              <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.edit"/>
              Tahrirlash
            </button>
            <button :class="['ua-btn', u.active?'ua-btn--block':'ua-btn--open']" @click="toggleUserActive(u)">
              <svg viewBox="0 0 20 20" fill="currentColor" v-html="u.active ? SVG.ban : SVG.check"/>
              {{ u.active ? 'Bloklash' : 'Ochish' }}
            </button>
            <button class="ua-btn ua-btn--del" @click="deleteUser(u.id)">
              <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.trash"/>
            </button>
          </div>
        </div>

        <div v-if="!filteredUsers.length" class="empty">
          <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5"/><path d="M16 24h16M24 16v16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <p>Foydalanuvchilar topilmadi</p>
        </div>
      </div>
    </template>

    <!-- ═══ ROLES ═══ -->
    <template v-if="activeTab==='roles'">
      <div class="toolbar">
        <div class="tl"/>
        <button class="add-btn" @click="openAddRole">
          <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.plus"/>
          Rol qo'shish
        </button>
      </div>

      <div class="roles-list">
        <div v-for="role in roles" :key="role.id" class="rcard">
          <div class="rcard-strip" :style="{background:role.color}"/>
          <div class="rcard-hd">
            <div class="rcard-av" :style="{background:role.color+'22',color:role.color}">
              <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.shield"/>
            </div>
            <div class="rcard-info">
              <div class="rcard-name">
                {{ role.name }}
                <span v-if="role.isSystem" class="sys-tag">Tizim</span>
              </div>
              <div class="rcard-desc">{{ role.description }}</div>
            </div>
            <div class="rcard-stat" :style="{color:role.color}">
              <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.mijozlar"/>
              {{ role.userCount ?? 0 }} foydalanuvchi
            </div>
            <div class="rcard-acts">
              <button class="rb" @click="openEditRole(role)">
                <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.edit"/>
                Tahrirlash
              </button>
              <button class="rb rb--del" :disabled="!!role.isSystem" @click="deleteRole(role.id)">
                <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.trash"/>
              </button>
            </div>
          </div>

          <!-- Permission matrix -->
          <div class="perm-matrix">
            <div v-for="mod in MODULES" :key="mod.module" class="pm-col"
              :class="(role.perms[mod.module]??[]).length===0 && 'pm-col--off'">
              <div class="pm-mod" :style="(role.perms[mod.module]??[]).length>0 ? {borderTopColor:mod.color} : {}">
                <svg viewBox="0 0 20 20" fill="currentColor" :style="{color:(role.perms[mod.module]??[]).length>0?mod.color:'currentColor'}" v-html="mod.svgPath"/>
                <span>{{ mod.label }}</span>
              </div>
              <div class="pm-acts">
                <template v-if="(role.perms[mod.module]??[]).length===0">
                  <span class="pm-denied">
                    <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.ban"/>
                    Yopiq
                  </span>
                </template>
                <template v-else>
                  <span v-for="act in mod.actions" :key="act.key"
                    :class="['pm-act', (role.perms[mod.module]??[]).includes(act.key)?'pm-act--on':'pm-act--no']"
                    :style="(role.perms[mod.module]??[]).includes(act.key)?{background:mod.color+'15',color:mod.color}:{}">
                    <svg viewBox="0 0 20 20" fill="currentColor" v-html="act.svgPath"/>
                    {{ act.label }}
                  </span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ MODAL: User ═══ -->
    <teleport to="body">
      <transition name="mfade">
        <div v-if="modalMode==='add-user'||modalMode==='edit-user'" class="overlay" @click.self="modalMode=null">
          <div class="modal modal--user">
            <div class="mhd">
              <div class="mhd-title">
                <span class="mhd-ic" style="background:rgba(139,92,246,.12);color:#a78bfa">
                  <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.users_add"/>
                </span>
                {{ modalMode==='edit-user' ? 'Foydalanuvchini tahrirlash' : "Foydalanuvchi qo'shish" }}
              </div>
              <button class="mhd-x" @click="modalMode=null">
                <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.close"/>
              </button>
            </div>
            <div v-if="userFormError" class="ferr">{{ userFormError }}</div>

            <div class="modal-body">
              <div class="user-form">

                <!-- ── Shaxsiy ma'lumotlar ── -->
                <div class="fgroup">
                  <div class="fg-ttl">
                    <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.mijozlar"/>
                    Shaxsiy ma'lumotlar
                  </div>
                  <div class="f2">
                    <div class="f"><label class="fl">To'liq ism <span class="req">*</span></label><input v-model="userForm.name" v-maydon:fullname="uf" class="fi" placeholder="Familiya Ism"/></div>
                    <div class="f"><label class="fl">Username <span class="req">*</span></label><input v-model="userForm.username" v-maydon:username="uf" class="fi" placeholder="username" autocomplete="off"/></div>
                    <div class="f"><label class="fl">Parol{{ modalMode==='edit-user' ? ' (o\'zgartirish uchun)' : '' }} <span v-if="modalMode!=='edit-user'" class="req">*</span></label><input v-model="userForm.password" v-maydon:password="uf" type="password" class="fi" placeholder="••••••••" autocomplete="new-password"/></div>
                    <div class="f"><label class="fl">Parolni tasdiqlash{{ modalMode==='edit-user' ? '' : '' }} <span v-if="userForm.password" class="req">*</span></label><input v-model="userForm.confirmPassword" type="password" maxlength="100" class="fi" placeholder="••••••••" autocomplete="new-password"/></div>
                    <!-- Xarajat limiti (backend §22): faqat Admin belgilaydi; Admin/Programmer rolida limit qo'llanmaydi -->
                    <div v-if="adminmi" class="f"><label class="fl">Xarajat limiti (bitta xarajat, so'm)</label><NumberInput v-model="userForm.xarajatLimit" :bosh="''" css-class="fi" :disabled="userForm.role !== 'User'" :placeholder="userForm.role !== 'User' ? 'Bu rolda limit yo\'q' : 'Bo\'sh — cheklovsiz'"/><small class="fl-izoh">{{ userForm.role !== 'User' ? 'Admin va Programmer uchun limit qo\'llanmaydi' : userForm.xarajatLimit === '' || userForm.xarajatLimit == null ? 'Cheklovsiz: har qanday xarajat darhol yoziladi' : Number(userForm.xarajatLimit) === 0 ? '0 — har bir xarajat tasdiqqa ketadi' : 'Bundan katta xarajat tasdiqqa yuboriladi' }}</small></div>
                  </div>
                </div>

                <!-- ── Rol tanlash ── -->
                <div class="fgroup">
                  <div class="fg-ttl">
                    <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.shield"/>
                    Rol tanlash <span class="req">*</span>
                  </div>
                  <div class="role-grid">
                    <label v-for="r in BACKEND_ROLES" :key="r.value"
                      :class="['ropt', userForm.role===r.value&&'ropt--on']"
                      :style="userForm.role===r.value?{borderColor:r.color,background:r.color+'10'}:{}">
                      <input type="radio" :value="r.value" v-model="userForm.role" style="display:none"/>
                      <div class="ropt-top">
                        <span class="ropt-dot" :style="{background:r.color}"/>
                        <span class="ropt-name" :style="userForm.role===r.value?{color:r.color}:{}">{{ r.label }}</span>
                        <svg v-if="userForm.role===r.value" viewBox="0 0 20 20" fill="currentColor" class="ropt-chk" :style="{color:r.color}" v-html="SVG.check"/>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- ── Faol toggle ── -->
                <label class="sw-row">
                  <input type="checkbox" v-model="userForm.active"/>
                  <span class="sw-t"><span class="sw-th"/></span>
                  Faol foydalanuvchi
                </label>

                <!-- ── Ruxsatlar ── -->
                <div class="perm-section">
                  <!-- Header -->
                  <div class="perm-hd">
                    <div class="perm-hd-l">
                      <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.lock"/>
                      <span>Ruxsatlar</span>
                      <span class="perm-counter">
                        {{ MODULES.filter(m=>modLevel(m.module)!=='none').length }}/{{ MODULES.length }}
                      </span>
                    </div>
                    <div class="perm-hd-r">
                      <button class="perm-all-btn perm-all-btn--grant" @click="grantAllUser" type="button">Hammaga</button>
                      <button class="perm-all-btn perm-all-btn--revoke" @click="revokeAllUser" type="button">Hammasini yopish</button>
                    </div>
                  </div>

                  <!-- Rol hint -->
                  <div v-if="selectedUserRole" class="perm-role-hint" :style="{borderLeftColor:selectedUserRole.color}">
                    <span class="prh-dot" :style="{background:selectedUserRole.color}"/>
                    <span class="prh-txt">{{ selectedUserRole.label }} roli tanlandi. Ruxsatlarni qo'lda o'zgartiring.</span>
                  </div>

                  <!-- Module grid -->
                  <div class="perm-grid">
                    <div v-for="mod in MODULES" :key="mod.module" class="perm-mod"
                      :class="modLevel(mod.module)==='none' ? 'perm-mod--off' : modLevel(mod.module)==='full' ? 'perm-mod--full' : 'perm-mod--part'">

                      <!-- Modul sarlavhasi + toggle -->
                      <div class="perm-mod-row">
                        <button class="perm-tog" type="button" @click="toggleUserModule(mod.module)"
                          :style="modLevel(mod.module)!=='none' ? {background:mod.color+'18', borderColor:mod.color+'40'} : {}">
                          <svg viewBox="0 0 20 20" fill="currentColor"
                            :style="{color: modLevel(mod.module)!=='none' ? mod.color : 'var(--muted)'}"
                            v-html="mod.svgPath"/>
                          <span class="perm-mod-lbl"
                            :style="{color: modLevel(mod.module)!=='none' ? mod.color : 'var(--body)'}">
                            {{ mod.label }}
                          </span>
                          <span class="perm-sw" :class="modLevel(mod.module)!=='none' ? 'perm-sw--on' : ''"
                            :style="modLevel(mod.module)!=='none' ? {background:mod.color} : {}">
                            <span class="perm-sw-th"/>
                          </span>
                        </button>
                        <span class="perm-status"
                          :class="modLevel(mod.module)==='none' ? 'perm-status--off' : modLevel(mod.module)==='full' ? 'perm-status--full' : 'perm-status--part'"
                          :style="modLevel(mod.module)!=='none' ? {color:mod.color} : {}">
                          {{ modLevel(mod.module)==='none' ? 'Yopiq' : modLevel(mod.module)==='full' ? "To'liq" : 'Qisman' }}
                        </span>
                      </div>

                      <!-- Action tugmalar — har doim ko'rinadi, modul off bo'lsa xira -->
                      <div class="perm-actions">
                        <button v-for="act in mod.actions" :key="act.key"
                          type="button"
                          class="perm-act-btn"
                          :class="hasPerm(mod.module, act.key) ? 'perm-act-btn--on' : 'perm-act-btn--off'"
                          :style="hasPerm(mod.module, act.key) ? {background:mod.color+'18', borderColor:mod.color+'50', color:mod.color} : {}"
                          @click="toggleUserPerm(mod.module, act.key)">
                          <svg viewBox="0 0 20 20" fill="currentColor" v-html="act.svgPath"/>
                          {{ act.label }}
                          <span class="perm-act-dot" :class="hasPerm(mod.module, act.key) ? 'perm-act-dot--on' : ''"
                            :style="hasPerm(mod.module, act.key) ? {background:mod.color} : {}"/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div class="mft">
              <button class="btn-c" :disabled="userSaving" @click="modalMode=null">Bekor qilish</button>
              <button class="btn-s" :disabled="userSaving" @click="saveUser">
                <span v-if="userSaving" class="spin spin--sm"/>
                <svg v-else viewBox="0 0 20 20" fill="currentColor" v-html="SVG.check"/>
                {{ userSaving ? 'Saqlanmoqda...' : 'Saqlash' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- ═══ MODAL: Role ═══ -->
    <teleport to="body">
      <transition name="mfade">
        <div v-if="modalMode==='add-role'||modalMode==='edit-role'" class="overlay" @click.self="modalMode=null">
          <div class="modal modal--role">
            <div class="mhd">
              <div class="mhd-title">
                <span class="mhd-ic" style="background:rgba(139,92,246,.12);color:#8b5cf6">
                  <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.shield"/>
                </span>
                {{ modalMode==='edit-role' ? 'Rolni tahrirlash' : 'Yangi rol yaratish' }}
              </div>
              <button class="mhd-x" @click="modalMode=null">
                <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.close"/>
              </button>
            </div>
            <div v-if="roleFormError" class="ferr">{{ roleFormError }}</div>

            <!-- Meta bar -->
            <div class="rmeta">
              <div class="f" style="flex:1.2"><label class="fl">Rol nomi <span class="req">*</span></label><input v-model="roleForm.name" class="fi" placeholder="Menejer, Agent..."/></div>
              <div class="f" style="flex:2"><label class="fl">Tavsif</label><input v-model="roleForm.description" class="fi" placeholder="Bu rol nima uchun..."/></div>
              <div class="f">
                <label class="fl">Rang</label>
                <div class="clrs">
                  <button v-for="c in ROLE_COLORS" :key="c" :class="['clr', roleForm.color===c&&'clr--on']" :style="{background:c,outlineColor:c}" @click="roleForm.color=c"/>
                  <span class="clr-prev" :style="{background:roleForm.color}">{{ roleForm.name ? roleForm.name[0].toUpperCase() : 'R' }}</span>
                </div>
              </div>
              <div class="f" v-if="modalMode==='add-role'">
                <label class="fl">Shablondan nusxa</label>
                <select v-model="copyFromRole" class="fsel"><option value="">— Noldan —</option><option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option></select>
              </div>
            </div>

            <!-- Editor -->
            <div class="reditor">
              <div class="re-bar">
                <button class="gbl gbl--all" @click="grantAll">
                  <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.check"/>
                  Barchasiga ruxsat
                </button>
                <button class="gbl gbl--no" @click="revokeAll">
                  <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.ban"/>
                  Barchasini yopish
                </button>
              </div>
              <div class="re-split">
                <!-- Left -->
                <div class="re-left">
                  <div v-for="mod in MODULES" :key="mod.module"
                    :class="['remod', selectedMod===mod.module&&'remod--on']"
                    @click="selectedMod=mod.module">
                    <svg viewBox="0 0 20 20" fill="currentColor" class="remod-ic"
                      :style="{color: selectedMod===mod.module||moduleAccessLevel(mod.module)!=='none' ? mod.color : 'currentColor'}"
                      v-html="mod.svgPath"/>
                    <span class="remod-lbl">{{ mod.label }}</span>
                    <span :class="['remod-badge',
                      moduleAccessLevel(mod.module)==='full'    && 'remod-badge--full',
                      moduleAccessLevel(mod.module)==='partial' && 'remod-badge--partial',
                      moduleAccessLevel(mod.module)==='none'    && 'remod-badge--none']">
                      <template v-if="moduleAccessLevel(mod.module)==='full'">To'liq</template>
                      <template v-else-if="moduleAccessLevel(mod.module)==='partial'">{{ (roleForm.perms[mod.module]??[]).length }}/{{ mod.actions.length }}</template>
                      <template v-else>Yopiq</template>
                    </span>
                    <svg v-if="selectedMod===mod.module" viewBox="0 0 20 20" fill="currentColor" class="remod-arr" v-html="SVG.chevron_r"/>
                  </div>
                </div>

                <!-- Right -->
                <div class="re-right">
                  <div class="rer-hd">
                    <div class="rer-hd-ic" :style="{background:MOD_MAP[selectedMod].color+'18',color:MOD_MAP[selectedMod].color}">
                      <svg viewBox="0 0 20 20" fill="currentColor" v-html="MOD_MAP[selectedMod].svgPath"/>
                    </div>
                    <div>
                      <div class="rer-title" :style="{color:MOD_MAP[selectedMod].color}">{{ MOD_MAP[selectedMod].label }}</div>
                      <div class="rer-sub">Ushbu bo'lim uchun ruxsatlar</div>
                    </div>
                    <button class="tog-all"
                      :class="moduleAccessLevel(selectedMod)==='full'?'tog-all--off':'tog-all--on'"
                      @click="toggleModule(selectedMod)">
                      {{ moduleAccessLevel(selectedMod)==='full' ? 'Barchasini yopish' : 'Barchasiga ruxsat' }}
                    </button>
                  </div>

                  <div class="act-list">
                    <div v-for="act in MOD_MAP[selectedMod].actions" :key="act.key"
                      :class="['act-row', (roleForm.perms[selectedMod]??[]).includes(act.key)&&'act-row--on']"
                      :style="(roleForm.perms[selectedMod]??[]).includes(act.key)?{borderColor:MOD_MAP[selectedMod].color+'35',background:MOD_MAP[selectedMod].color+'06'}:{}"
                      @click="togglePerm(selectedMod, act.key)">
                      <div class="act-ic" :style="{background:MOD_MAP[selectedMod].color+'15',color:MOD_MAP[selectedMod].color}">
                        <svg viewBox="0 0 20 20" fill="currentColor" v-html="act.svgPath"/>
                      </div>
                      <div class="act-info">
                        <div class="act-lbl">{{ act.label }}</div>
                        <div class="act-key">{{ act.key }}</div>
                      </div>
                      <label class="bsw" @click.stop>
                        <input type="checkbox" :checked="(roleForm.perms[selectedMod]??[]).includes(act.key)" @change="togglePerm(selectedMod, act.key)"/>
                        <span class="bsw-t" :style="(roleForm.perms[selectedMod]??[]).includes(act.key)?{background:MOD_MAP[selectedMod].color}:{}">
                          <span class="bsw-th"/>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div class="prog-bar" :style="{borderColor:MOD_MAP[selectedMod].color+'35',background:MOD_MAP[selectedMod].color+'06'}">
                    <div class="prog-track">
                      <div class="prog-fill" :style="{width:((roleForm.perms[selectedMod]??[]).length/MOD_MAP[selectedMod].actions.length*100)+'%',background:MOD_MAP[selectedMod].color}"/>
                    </div>
                    <span :style="{color:MOD_MAP[selectedMod].color}">{{ (roleForm.perms[selectedMod]??[]).length }}/{{ MOD_MAP[selectedMod].actions.length }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mft">
              <div class="mft-sum">
                <span class="mft-lbl">Berilgan ruxsatlar:</span>
                <span v-for="mod in MODULES.filter(m=>(roleForm.perms[m.module]??[]).length>0)" :key="mod.module"
                  class="mft-chip" :style="{background:mod.color+'15',color:mod.color,borderColor:mod.color+'30'}">
                  <svg viewBox="0 0 20 20" fill="currentColor" v-html="mod.svgPath"/>
                  {{ (roleForm.perms[mod.module]??[]).length }}
                </span>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn-c" @click="modalMode=null">Bekor qilish</button>
                <button class="btn-s" @click="saveRole">
                  <svg viewBox="0 0 20 20" fill="currentColor" v-html="SVG.check"/>
                  Rolni saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

  </div>
</template>

<style scoped>
.fu-page { display:flex; flex-direction:column; gap:16px; padding:4px 0; }

/* Spinner */
@keyframes spin { to { transform:rotate(360deg); } }
.spin { display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .6s linear infinite; flex-shrink:0; }
.spin--sm { width:13px; height:13px; }

/* API states */
.api-loading { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; background:rgba(139,92,246,.08); color:#a78bfa; font-size:13px; }
.api-loading .spin { border-color:rgba(139,92,246,.25); border-top-color:#8b5cf6; }
.api-err { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.18); color:#ef4444; font-size:13px; }
.api-err svg { width:15px; height:15px; flex-shrink:0; }
.api-err button { margin-left:auto; height:26px; padding:0 10px; border-radius:6px; border:1px solid rgba(239,68,68,.3); background:transparent; color:#ef4444; font-size:11px; cursor:pointer; }
.api-err button:hover { background:rgba(239,68,68,.1); }

/* Stats */
.stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.stat-card { display:flex; align-items:center; gap:14px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:14px; padding:16px 20px; }
.sic { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sic svg { width:20px; height:20px; }
.sv { font-size:22px; font-weight:700; color:var(--title); line-height:1; }
.sl { font-size:12px; color:var(--muted); margin-top:2px; }

/* Tabs */
.tabs-bar { display:flex; }
.tabs-inner { display:inline-flex; gap:2px; background:var(--seg-track); border:1px solid var(--seg-brd); border-radius:12px; padding:3px; }
.tab { display:inline-flex; align-items:center; gap:7px; height:36px; padding:0 16px; border-radius:10px; border:none; background:transparent; color:var(--seg-ink); font-size:13px; font-weight:500; cursor:pointer; transition:.15s; white-space:nowrap; }
.tab:hover:not(.tab--on) { color:var(--seg-ink-h); }
.tab svg { width:16px; height:16px; flex-shrink:0; }
.tab--on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); font-weight:600; }
.tab-n { min-width:20px; height:18px; padding:0 5px; border-radius:99px; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.tab--on .tab-n { background:var(--cnt-on-bg); color:var(--seg-on-ink); }
.tab:not(.tab--on) .tab-n { background:var(--card-border); color:var(--muted); }

/* Toolbar */
.toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.tl { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.srch { display:flex; align-items:center; gap:8px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:10px; padding:0 12px; height:36px; min-width:210px; }
.srch svg { width:15px; height:15px; color:var(--muted); flex-shrink:0; }
.srch-in { border:none; background:transparent; outline:none; font-size:13px; color:var(--body); width:100%; }
.srch-in::placeholder { color:var(--muted); }
.flt { height:36px; padding:0 10px; border-radius:10px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:12px; cursor:pointer; outline:none; }
.add-btn { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 16px; border-radius:10px; border:none; background:linear-gradient(135deg,#a78bfa,#8b5cf6); color:#fff; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(139,92,246,.28); white-space:nowrap; transition:.15s; }
.add-btn:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(139,92,246,.4); }
.add-btn svg { width:16px; height:16px; }

/* User cards */
.user-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
.ucard { background:var(--card-bg); border:1px solid var(--card-border); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; transition:.15s; }
.ucard:hover { box-shadow:0 4px 18px rgba(0,0,0,.07); transform:translateY(-1px); }

.ucard-hd { display:flex; align-items:center; gap:10px; }
.ucard-av { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; flex-shrink:0; }
.ucard-info { flex:1; min-width:0; }
.ucard-name  { font-size:13px; font-weight:700; color:var(--title); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ucard-email { font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ucard-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.ucard-dot--on  { background:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.18); }
.ucard-dot--off { background:#9ca3af; }

.ucard-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.role-tag { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:99px; border:1px solid; font-size:11px; font-weight:600; }
.role-tag svg { width:11px; height:11px; flex-shrink:0; }
.region-tag { display:inline-flex; align-items:center; gap:4px; font-size:11px; color:var(--muted); }
.region-tag svg { width:11px; height:11px; flex-shrink:0; }

/* Access chips bar */
.access-bar { display:flex; flex-direction:column; }
.ab-label { display:block; font-size:10px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px; }
.ab-chips { display:flex; gap:4px; flex-wrap:wrap; }
.ab-chip { width:28px; height:28px; border-radius:7px; border:1px solid var(--card-border); background:var(--mini-bg); display:flex; align-items:center; justify-content:center; transition:.1s; cursor:default; }
.ab-chip svg { width:13px; height:13px; }
.ab-chip--off { opacity:.28; }

.ucard-login { display:inline-flex; align-items:center; gap:5px; font-size:11px; color:var(--muted); }
.ucard-login svg { width:12px; height:12px; flex-shrink:0; }

.ucard-ft { display:flex; gap:5px; padding-top:6px; border-top:1px solid var(--card-border); }
.ua-btn { display:inline-flex; align-items:center; gap:5px; height:30px; padding:0 10px; border-radius:8px; border:1px solid var(--card-border); background:transparent; font-size:11px; font-weight:500; cursor:pointer; transition:.14s; color:var(--body); }
.ua-btn svg { width:13px; height:13px; flex-shrink:0; }
.ua-btn--edit  { flex:1; justify-content:center; }
.ua-btn--edit:hover  { background:rgba(139,92,246,.08); color:#8b5cf6; border-color:rgba(139,92,246,.25); }
.ua-btn--block { color:#ef4444; border-color:rgba(239,68,68,.2); }
.ua-btn--block:hover { background:rgba(239,68,68,.08); }
.ua-btn--open  { color:#10b981; border-color:rgba(16,185,129,.2); }
.ua-btn--open:hover  { background:rgba(16,185,129,.08); }
.ua-btn--del { width:30px; padding:0; justify-content:center; }
.ua-btn--del:hover  { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.2); }

.empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px 0; color:var(--muted); grid-column:1/-1; }
.empty svg { width:44px; height:44px; }
.empty p { font-size:13px; }

/* Role cards */
.roles-list { display:flex; flex-direction:column; gap:10px; }
.rcard { background:var(--card-bg); border:1px solid var(--card-border); border-radius:14px; overflow:hidden; position:relative; }
.rcard-strip { position:absolute; left:0; top:0; bottom:0; width:3px; }
.rcard-hd { display:flex; align-items:center; gap:12px; padding:14px 16px 14px 20px; border-bottom:1px solid var(--card-border); }
.rcard-av { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rcard-av svg { width:18px; height:18px; }
.rcard-info { flex:1; min-width:0; }
.rcard-name { display:flex; align-items:center; gap:7px; font-size:14px; font-weight:700; color:var(--title); }
.sys-tag { font-size:10px; font-weight:600; padding:1px 7px; border-radius:99px; background:rgba(239,68,68,.1); color:#ef4444; border:1px solid rgba(239,68,68,.18); }
.rcard-desc { font-size:11px; color:var(--muted); margin-top:2px; }
.rcard-stat { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:600; flex-shrink:0; }
.rcard-stat svg { width:14px; height:14px; }
.rcard-acts { display:flex; gap:6px; }
.rb { display:inline-flex; align-items:center; gap:5px; height:30px; padding:0 10px; border-radius:8px; border:1px solid var(--card-border); background:transparent; color:var(--body); font-size:12px; cursor:pointer; transition:.14s; white-space:nowrap; }
.rb svg { width:13px; height:13px; }
.rb:hover:not(:disabled) { background:rgba(139,92,246,.08); color:#8b5cf6; border-color:rgba(139,92,246,.2); }
.rb--del { padding:0 8px; }
.rb--del:hover:not(:disabled) { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.2); }
.rb:disabled { opacity:.3; cursor:not-allowed; }

/* Permission matrix */
.perm-matrix { display:grid; grid-template-columns:repeat(9,1fr); }
@media(max-width:1100px) { .perm-matrix { grid-template-columns:repeat(5,1fr); } }
.pm-col { border-right:1px solid var(--card-border); padding:10px 8px; }
.pm-col:last-child { border-right:none; }
.pm-col--off { opacity:.38; }
.pm-mod { display:flex; flex-direction:column; align-items:center; gap:4px; padding-bottom:8px; border-bottom:1px solid var(--card-border); border-top:2.5px solid transparent; margin-bottom:6px; }
.pm-mod svg { width:16px; height:16px; }
.pm-mod span { font-size:10px; font-weight:600; color:var(--body); text-align:center; line-height:1.2; }
.pm-acts { display:flex; flex-direction:column; gap:3px; }
.pm-act { display:flex; align-items:center; gap:4px; font-size:10px; font-weight:500; padding:2px 5px; border-radius:5px; }
.pm-act svg { width:11px; height:11px; flex-shrink:0; }
.pm-act--no { opacity:.2; color:var(--muted); }
.pm-denied { display:flex; align-items:center; gap:3px; font-size:10px; color:#ef4444; opacity:.55; }
.pm-denied svg { width:11px; height:11px; }

/* Modal base */
.overlay { position:fixed; inset:0; background:rgba(0,0,0,.48); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:9000; padding:20px; }
.modal { background:var(--card-bg); border:1px solid var(--card-border); border-radius:18px; display:flex; flex-direction:column; box-shadow:0 24px 64px rgba(0,0,0,.28); height:92vh; overflow:hidden; width:100%; }
.modal--user { max-width:1280px; }
.modal--role { max-width:1280px; }

.mhd { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 16px; flex-shrink:0; border-bottom:1px solid var(--card-border); }
.mhd-title { display:flex; align-items:center; gap:10px; font-size:15px; font-weight:700; color:var(--title); }
.mhd-ic { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mhd-ic svg { width:16px; height:16px; }
.mhd-x { width:30px; height:30px; border-radius:8px; border:1px solid var(--card-border); background:transparent; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.mhd-x:hover { background:var(--row-hover); color:var(--title); }
.mhd-x svg { width:14px; height:14px; }

.ferr { margin:0 22px; margin-top:10px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.2); border-radius:8px; padding:7px 12px; font-size:12px; color:#ef4444; flex-shrink:0; }

.modal-body { padding:18px 22px; overflow-y:auto; flex:1; min-height:0; }
.mft { display:flex; align-items:center; justify-content:space-between; padding:13px 22px; border-top:1px solid var(--card-border); flex-shrink:0; gap:10px; }
.mft-sum { display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
.mft-lbl { font-size:11px; color:var(--muted); }
.mft-chip { display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:700; padding:2px 7px; border-radius:99px; border:1px solid; }
.mft-chip svg { width:11px; height:11px; }

/* Form */
.rmeta { display:flex; gap:12px; padding:13px 22px; background:var(--mini-bg); border-bottom:1px solid var(--card-border); flex-wrap:wrap; flex-shrink:0; align-items:flex-end; }
.f { display:flex; flex-direction:column; gap:4px; }
.fl { font-size:11px; font-weight:600; color:var(--body); }
.req { color:#ef4444; }
.fi { height:36px; padding:0 10px; border-radius:8px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--title); font-size:13px; outline:none; font-family:inherit; }
.fi:focus { border-color:#a78bfa; box-shadow:0 0 0 3px rgba(167,139,250,.1); }
.fsel { height:36px; padding:0 9px; border-radius:8px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--title); font-size:12px; outline:none; cursor:pointer; font-family:inherit; }

/* Color picker */
.clrs { display:flex; gap:5px; align-items:center; flex-wrap:wrap; }
.clr { width:20px; height:20px; border-radius:50%; border:2px solid transparent; cursor:pointer; outline:2px solid transparent; outline-offset:2px; transition:.15s; }
.clr--on { outline-style:solid; transform:scale(1.15); }
.clr-prev { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; margin-left:4px; flex-shrink:0; }

/* User modal layout */
.user-form { display:flex; flex-direction:column; gap:14px; }

.fgroup { background:var(--mini-bg); border:1px solid var(--card-border); border-radius:12px; padding:13px 14px; display:flex; flex-direction:column; gap:10px; }
.fg-ttl { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--title); text-transform:uppercase; letter-spacing:.05em; }
.fg-ttl svg { width:13px; height:13px; color:#8b5cf6; }
.f2 { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; }

/* Role grid in user modal */
.role-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:7px; }
.ropt { display:flex; flex-direction:column; gap:3px; padding:9px 11px; border-radius:9px; border:1.5px solid var(--card-border); cursor:pointer; transition:.14s; }
.ropt:hover { background:var(--row-hover); }
.ropt-top { display:flex; align-items:center; gap:6px; }
.ropt-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.ropt-name { font-size:12px; font-weight:700; color:var(--title); flex:1; }
.ropt-chk { width:14px; height:14px; flex-shrink:0; }
.ropt-desc { font-size:10px; color:var(--muted); }
.ropt-cnt  { font-size:10px; color:var(--muted); font-weight:600; }

/* Preview panel */
.prev-ttl { display:flex; align-items:center; gap:5px; font-size:10px; font-weight:700; color:var(--title); text-transform:uppercase; letter-spacing:.05em; }
.prev-ttl svg { width:13px; height:13px; color:#8b5cf6; }
.prev-role { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; }
.prev-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.prev-list { display:flex; flex-direction:column; gap:2px; overflow-y:auto; flex:1; }
.prev-row { display:flex; align-items:center; gap:6px; padding:5px 8px; border-radius:7px; }
.prev-row--on  { background:var(--mini-bg); }
.prev-row--off { opacity:.35; }
.prev-mic { width:13px; height:13px; flex-shrink:0; }
.prev-mlbl { font-size:11px; color:var(--body); flex:1; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.prev-acts { display:flex; gap:3px; flex-shrink:0; }
.prev-act { width:16px; height:16px; display:flex; align-items:center; justify-content:center; transition:.1s; }
.prev-act svg { width:12px; height:12px; }
.prev-act--off { opacity:.2; }
.prev-no { font-size:10px; color:#ef4444; }
.prev-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:var(--muted); }
.prev-empty svg { width:36px; height:36px; }
.prev-empty p { font-size:12px; }

/* Switch */
.sw-row { display:flex; align-items:center; gap:9px; cursor:pointer; font-size:13px; color:var(--body); }
.sw-row input { display:none; }
.sw-t { width:38px; height:22px; background:var(--muted); border-radius:99px; position:relative; transition:.2s; flex-shrink:0; }
.sw-row input:checked + .sw-t { background:#8b5cf6; }
.sw-th { position:absolute; top:2px; left:2px; width:18px; height:18px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 1px 4px rgba(0,0,0,.2); }
.sw-row input:checked + .sw-t .sw-th { left:18px; }

/* Role editor */
.reditor { display:flex; flex-direction:column; flex:1; overflow:hidden; min-height:0; }
.re-bar { display:flex; gap:8px; padding:9px 22px; background:var(--mini-bg); border-bottom:1px solid var(--card-border); flex-shrink:0; }
.gbl { display:inline-flex; align-items:center; gap:5px; height:28px; padding:0 11px; border-radius:7px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid; transition:.14s; }
.gbl svg { width:13px; height:13px; }
.gbl--all { background:rgba(139,92,246,.08); color:#8b5cf6; border-color:rgba(139,92,246,.22); }
.gbl--all:hover  { background:rgba(139,92,246,.15); }
.gbl--no  { background:rgba(239,68,68,.07); color:#ef4444; border-color:rgba(239,68,68,.18); }
.gbl--no:hover   { background:rgba(239,68,68,.13); }

.re-split { display:grid; grid-template-columns:210px 1fr; flex:1; overflow:hidden; min-height:0; border-top:1px solid var(--card-border); }
.re-left  { overflow-y:auto; border-right:1px solid var(--card-border); padding:5px 0; }
.remod { display:flex; align-items:center; gap:8px; padding:8px 13px; cursor:pointer; transition:.12s; border-right:2.5px solid transparent; }
.remod:hover { background:var(--row-hover); }
.remod--on { background:rgba(139,92,246,.06) !important; border-right-color:#8b5cf6; }
.remod-ic  { width:15px; height:15px; flex-shrink:0; color:var(--muted); transition:.15s; }
.remod-lbl { font-size:12px; color:var(--body); font-weight:500; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.remod-badge { font-size:10px; font-weight:700; padding:1px 6px; border-radius:99px; flex-shrink:0; }
.remod-badge--full    { background:rgba(16,185,129,.12); color:#10b981; }
.remod-badge--partial { background:rgba(245,158,11,.12);  color:#f59e0b; }
.remod-badge--none    { background:rgba(239,68,68,.09);   color:#ef4444; }
.remod-arr { width:11px; height:11px; color:#a78bfa; flex-shrink:0; }

.re-right { overflow-y:auto; padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
.rer-hd { display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid var(--card-border); flex-shrink:0; }
.rer-hd-ic { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rer-hd-ic svg { width:18px; height:18px; }
.rer-title { font-size:14px; font-weight:700; }
.rer-sub   { font-size:11px; color:var(--muted); margin-top:1px; }
.tog-all { margin-left:auto; height:28px; padding:0 11px; border-radius:7px; border:1px solid; font-size:11px; font-weight:600; cursor:pointer; transition:.14s; white-space:nowrap; flex-shrink:0; }
.tog-all--on  { background:rgba(139,92,246,.08); color:#8b5cf6; border-color:rgba(139,92,246,.22); }
.tog-all--off { background:rgba(239,68,68,.07); color:#ef4444; border-color:rgba(239,68,68,.18); }

.act-list { display:flex; flex-direction:column; gap:5px; }
.act-row { display:flex; align-items:center; gap:12px; padding:11px 13px; border-radius:10px; border:1px solid var(--card-border); background:var(--mini-bg); cursor:pointer; transition:.14s; }
.act-row:hover { border-color:#a78bfa; }
.act-row--on { background:rgba(139,92,246,.06); border-color:rgba(139,92,246,.25); }
.act-ic { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.act-ic svg { width:15px; height:15px; }
.act-info { flex:1; }
.act-lbl { font-size:13px; font-weight:600; color:var(--title); }
.act-key { font-size:10px; color:var(--muted); font-family:monospace; margin-top:1px; }

/* Big switch */
.bsw { flex-shrink:0; cursor:pointer; }
.bsw input { display:none; }
.bsw-t { display:block; width:44px; height:24px; background:var(--card-border); border-radius:99px; position:relative; transition:.2s; }
.bsw-th { position:absolute; top:2px; left:2px; width:20px; height:20px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 1px 4px rgba(0,0,0,.2); }
.bsw input:checked + .bsw-t .bsw-th { left:22px; }

.prog-bar { display:flex; align-items:center; gap:10px; border:1px solid; border-radius:9px; padding:9px 12px; flex-shrink:0; }
.prog-track { flex:1; height:6px; background:var(--card-border); border-radius:99px; overflow:hidden; }
.prog-fill { height:100%; border-radius:99px; transition:.3s; }
.prog-bar span { font-size:11px; font-weight:700; white-space:nowrap; }

/* Buttons */
.btn-c { height:36px; padding:0 16px; border-radius:9px; border:1px solid var(--card-border); background:transparent; color:var(--body); font-size:13px; cursor:pointer; }
.btn-c:hover { background:var(--row-hover); }
.btn-s { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 18px; border-radius:9px; border:none; background:#8b5cf6; color:#fff; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(139,92,246,.28); }
.btn-s:hover { background:#7c3aed; }
.btn-s svg { width:15px; height:15px; }

/* Transition */
.mfade-enter-active,.mfade-leave-active { transition:.2s; }
.mfade-enter-from,.mfade-leave-to { opacity:0; }
.mfade-enter-from .modal,.mfade-leave-to .modal { transform:scale(.96) translateY(8px); }
.mfade-enter-active .modal,.mfade-leave-active .modal { transition:.2s; }

/* ── Permission panel (user modal) ── */
.perm-section { background:var(--mini-bg); border:1px solid var(--card-border); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px; }

.perm-hd { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-shrink:0; margin-bottom:4px; }
.perm-hd-l { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--title); text-transform:uppercase; letter-spacing:.05em; }
.perm-hd-l svg { width:13px; height:13px; color:#8b5cf6; }
.perm-counter { min-width:32px; height:18px; padding:0 6px; border-radius:99px; background:rgba(139,92,246,.12); color:#a78bfa; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.perm-hd-r { display:flex; gap:4px; }
.perm-all-btn { height:22px; padding:0 8px; border-radius:6px; border:1px solid; font-size:10px; font-weight:600; cursor:pointer; transition:.14s; white-space:nowrap; }
.perm-all-btn--grant  { background:rgba(139,92,246,.08); color:#8b5cf6; border-color:rgba(139,92,246,.25); }
.perm-all-btn--grant:hover  { background:rgba(139,92,246,.16); }
.perm-all-btn--revoke { background:rgba(239,68,68,.07); color:#ef4444; border-color:rgba(239,68,68,.2); }
.perm-all-btn--revoke:hover { background:rgba(239,68,68,.13); }

.perm-role-hint { display:flex; align-items:center; gap:7px; padding:6px 10px; border-radius:8px; border-left:3px solid; background:var(--mini-bg); border:1px solid var(--card-border); flex-shrink:0; }
.prh-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.prh-txt { font-size:11px; color:var(--muted); line-height:1.3; }

.perm-list { display:flex; flex-direction:column; gap:5px; overflow-y:auto; flex:1; }
.perm-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:6px; }

.perm-mod { border-radius:9px; border:1px solid var(--card-border); overflow:hidden; transition:.14s; }
.perm-mod--off  { opacity:.65; }
.perm-mod--part { border-color:rgba(245,158,11,.3); }
.perm-mod--full { border-color:rgba(16,185,129,.3); }

.perm-mod-row { display:flex; align-items:center; gap:6px; }
.perm-tog { display:flex; align-items:center; gap:7px; flex:1; padding:8px 10px; border:none; background:transparent; cursor:pointer; text-align:left; border-radius:8px; transition:.14s; min-width:0; }
.perm-tog:hover { background:var(--row-hover); }
.perm-tog svg { width:14px; height:14px; flex-shrink:0; color:var(--muted); transition:.15s; }
.perm-mod-lbl { font-size:12px; font-weight:600; color:var(--body); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:.15s; }

.perm-sw { display:block; width:30px; height:17px; background:var(--card-border); border-radius:99px; position:relative; transition:.2s; flex-shrink:0; margin-left:auto; }
.perm-sw-th { position:absolute; top:2px; left:2px; width:13px; height:13px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
.perm-sw--on .perm-sw-th { left:15px; }

.perm-status { font-size:10px; font-weight:600; padding:2px 7px; border-radius:99px; white-space:nowrap; flex-shrink:0; margin-right:8px; }
.perm-status--off  { background:rgba(239,68,68,.08);  color:#ef4444; }
.perm-status--full { background:rgba(16,185,129,.1);  color:#10b981; }
.perm-status--part { background:rgba(245,158,11,.1);  color:#f59e0b; }

.perm-actions { display:flex; flex-wrap:wrap; gap:5px; padding:6px 10px 10px; }

/* Action tugma — har doim ko'rinadi */
.perm-act-btn {
  display:inline-flex; align-items:center; gap:5px;
  height:28px; padding:0 10px; border-radius:7px;
  border:1.5px solid var(--card-border);
  background:var(--mini-bg);
  font-size:11px; font-weight:500; color:var(--muted);
  cursor:pointer; transition:.14s; user-select:none;
  position:relative;
}
.perm-act-btn svg { width:12px; height:12px; flex-shrink:0; }
.perm-act-btn:hover { border-color:#a78bfa; color:#8b5cf6; background:rgba(139,92,246,.06); }

.perm-act-btn--on { font-weight:700; }
.perm-act-btn--off { opacity:.55; }
.perm-act-btn--off:hover { opacity:1; }

/* Kichik yashil nuqta — yoqilgan holat */
.perm-act-dot {
  width:6px; height:6px; border-radius:50%;
  background:var(--card-border); flex-shrink:0;
  transition:.14s;
}
.perm-act-dot--on { background:#10b981; box-shadow:0 0 0 2px rgba(16,185,129,.2); }

/* Eski label (rol modal uchun) */
.perm-act-lbl { display:inline-flex; align-items:center; gap:4px; height:24px; padding:0 8px; border-radius:6px; border:1px solid var(--card-border); background:var(--mini-bg); font-size:11px; font-weight:500; color:var(--muted); cursor:pointer; transition:.14s; user-select:none; }
.perm-act-lbl:hover { border-color:#a78bfa; color:#8b5cf6; }
.perm-act-lbl svg { width:11px; height:11px; flex-shrink:0; }
.perm-act-lbl--on { font-weight:600; }

@media(max-width:1100px) {
  .stats-row { grid-template-columns:1fr 1fr; }
  .perm-grid { grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); }
}
@media(max-width:700px) {
  .stats-row { grid-template-columns:1fr 1fr; }
  .role-grid { grid-template-columns:1fr 1fr; }
  .f2 { grid-template-columns:1fr 1fr; }
}
@media(max-width:480px) {
  .role-grid { grid-template-columns:1fr; }
  .f2 { grid-template-columns:1fr; }
}
.ucard-limit { margin-left:auto; padding:1px 8px; border-radius:999px; background:#f5f3ff; color:#6d28d9; font-size:11px; font-weight:600; }
.fl-izoh { display:block; margin-top:4px; font-size:11.5px; color:#94a3b8; }
</style>
