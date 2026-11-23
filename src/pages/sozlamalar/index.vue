<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'

interface NavItem { key: string; label: string; icon: string; accent: string }

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Kompaniya',
    items: [
      { key: 'kompaniya',    label: 'Kompaniya profili', icon: 'building', accent: '#7c3aed' },
      { key: 'tolov-usuli', label: "To'lov usuli",       icon: 'credit',   accent: '#7c3aed' },
      { key: 'kurs',        label: 'Valyuta kursi',      icon: 'currency', accent: '#7c3aed' },
      { key: 'chek',        label: 'Chek — 80 mm printer', icon: 'printer',  accent: '#7c3aed' },
      { key: 'xavfsizlik',  label: 'Xavfsizlik',           icon: 'lock',     accent: '#7c3aed' },
    ],
  },
  {
    title: 'Tovar',
    items: [
      { key: 'olchov',           label: "O'lchov birliklari",       icon: 'scale',    accent: '#7c3aed' },
      { key: 'hudud',            label: 'Hudud',                    icon: 'map',      accent: '#7c3aed' },
      { key: 'mijoz-kategoriya', label: 'Mijoz kategoriyasi',       icon: 'tag',      accent: '#7c3aed' },
      { key: 'mijoz-turi',       label: 'Mijoz turi',               icon: 'users',    accent: '#7c3aed' },
      { key: 'reyting',          label: 'Mijoz reytingi',           icon: 'star',     accent: '#7c3aed' },
      { key: 'kategoriya',       label: 'Turkumlar',                icon: 'folder',   accent: '#7c3aed' },
      { key: 'tovar',            label: 'Tovar',                    icon: 'box',      accent: '#7c3aed' },
      { key: 'narx',             label: 'Narx turi / Narx',         icon: 'currency', accent: '#7c3aed' },
      { key: 'viloyat-narx',     label: 'Viloyat narxlari',         icon: 'map',      accent: '#7c3aed' },
    ],
  },
  {
    title: 'Jarayonlar',
    items: [
      { key: 'rad-etish',   label: 'Rad etish sabablari',        icon: 'ban',       accent: '#7c3aed' },
      { key: 'foto-hisobot',label: 'Foto-hisobot kategoriyasi',  icon: 'camera',    accent: '#7c3aed' },
      { key: 'inventar',    label: 'Inventar turi',              icon: 'clipboard', accent: '#7c3aed' },
      { key: 'bonus',       label: 'Bonuslar va chegirmalar',    icon: 'gift',      accent: '#7c3aed' },
    ],
  },
]

const ICONS: Record<string, string> = {
  building:  `<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/>`,
  credit:    `<path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/>`,
  scale:     `<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 14a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 5.677V19h2a1 1 0 110 2H7a1 1 0 110-2h2V5.677L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L8.999 4.323V3a1 1 0 011-1z" clip-rule="evenodd"/>`,
  map:       `<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>`,
  tag:       `<path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>`,
  users:     `<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>`,
  folder:    `<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>`,
  printer:   `<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>`,
  star:      `<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>`,
  lock:      `<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>`,
  box:       `<path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z"/>`,
  currency:  `<path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>`,
  ban:       `<path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>`,
  camera:    `<path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>`,
  clipboard: `<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>`,
  gift:      `<path fill-rule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clip-rule="evenodd"/><path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z"/>`,
}

const PAGE_COMPONENTS: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  tovar:              defineAsyncComponent(() => import('./tovar/index.vue')),
  kategoriya:         defineAsyncComponent(() => import('./kategoriya/index.vue')),
  chek:               defineAsyncComponent(() => import('./chek/index.vue')),
  narx:               defineAsyncComponent(() => import('./narx/index.vue')),
  'viloyat-narx':     defineAsyncComponent(() => import('./narx/viloyat.vue')),
  olchov:             defineAsyncComponent(() => import('./olchov/index.vue')),
  hudud:              defineAsyncComponent(() => import('./hudud/index.vue')),
  'mijoz-kategoriya': defineAsyncComponent(() => import('./mijoz-kategoriya/index.vue')),
  'mijoz-turi':       defineAsyncComponent(() => import('./mijoz-turi/index.vue')),
  'rad-etish':        defineAsyncComponent(() => import('./rad-etish/index.vue')),
  'foto-hisobot':     defineAsyncComponent(() => import('./foto-hisobot/index.vue')),
  inventar:           defineAsyncComponent(() => import('./inventar/index.vue')),
  bonus:              defineAsyncComponent(() => import('./bonus/index.vue')),
  kurs:               defineAsyncComponent(() => import('./kurs/index.vue')),
  xavfsizlik:         defineAsyncComponent(() => import('./xavfsizlik/index.vue')),
  reyting:            defineAsyncComponent(() => import('./reyting/index.vue')),
}

const activeKey = ref('tovar')
// Saqlanmagan o'zgarishi bor bo'lim (`ozgargan` ni ochib bergan) — boshqa bo'limga o'tishdan oldin so'raladi
const faolRef = ref<any>(null)
function tanla(k: string) {
  if (k === activeKey.value) return
  const n = faolRef.value?.ozgargan?.length
  if (n && !confirm(`${n} ta o'zgarish saqlanmagan. Tashlab yuborilsinmi?`)) return
  activeKey.value = k
}
const allItems  = NAV_GROUPS.flatMap(g => g.items)
const activeItem      = computed(() => allItems.find(i => i.key === activeKey.value)!)
const ActiveComponent = computed(() => PAGE_COMPONENTS[activeKey.value] ?? null)
const collapsed       = ref(false)
</script>

<template>
  <div :class="['sz-wrap', collapsed && 'sz-wrap--xs']">

    <!-- ══════ SIDEBAR ══════ -->
    <aside class="sz-side">

      <!-- Header -->
      <div class="sz-hd">
        <div class="sz-hd-left">
          <div class="sz-hd-ic">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
            </svg>
          </div>
          <Transition name="sz-fade">
            <span v-if="!collapsed" class="sz-hd-title">Sozlamalar</span>
          </Transition>
        </div>
        <button class="sz-toggle" @click="collapsed = !collapsed">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              :d="collapsed
                ? 'M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                : 'M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z'"
              clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <!-- Nav -->
      <nav class="sz-nav">
        <template v-for="group in NAV_GROUPS" :key="group.title">

          <Transition name="sz-fade">
            <div v-if="!collapsed" class="sz-grp-label">{{ group.title }}</div>
          </Transition>

          <button
            v-for="item in group.items" :key="item.key"
            :class="['sz-item', activeKey === item.key && 'sz-item--on']"
            :title="collapsed ? item.label : ''"
            @click="tanla(item.key)"
          >
            <!-- Icon pill -->
            <span
              class="sz-ic"
              :style="activeKey === item.key
                ? { background: item.accent + '22', color: item.accent, boxShadow: `0 0 0 1px ${item.accent}33` }
                : {}"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" v-html="ICONS[item.icon]"/>
            </span>

            <Transition name="sz-fade">
              <span v-if="!collapsed" class="sz-lbl">{{ item.label }}</span>
            </Transition>

            <!-- Active indicator -->
            <span v-if="activeKey === item.key && !collapsed" class="sz-active-dot"/>

            <!-- Active left bar -->
            <span v-if="activeKey === item.key" class="sz-bar" :style="{ background: item.accent }"/>
          </button>

          <div class="sz-sep"/>
        </template>
      </nav>
    </aside>

    <!-- ══════ CONTENT ══════ -->
    <main class="sz-main">
      <Suspense>
        <component :is="ActiveComponent" v-if="ActiveComponent" ref="faolRef"/>
        <template v-else>
          <div class="sz-empty">
            <div class="sz-empty-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p class="sz-empty-title">{{ activeItem?.label }}</p>
            <p class="sz-empty-sub">Bu bo'lim ishlab chiqilmoqda</p>
          </div>
        </template>
        <template #fallback>
          <div class="sz-loading">
            <div class="sz-spin"/>
          </div>
        </template>
      </Suspense>
    </main>

  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────────── */
.sz-wrap {
  display: grid;
  grid-template-columns: 256px 1fr;
  min-height: calc(100vh - 60px);
  transition: grid-template-columns .25s cubic-bezier(.4,0,.2,1);
}
.sz-wrap--xs { grid-template-columns: 60px 1fr; }

/* ── Sidebar ─────────────────────────────────────────────────────────────────── */
.sz-side {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-right: 1px solid var(--card-border);
  overflow: hidden;
  position: relative;
}

/* Header */
.sz-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 18px 14px 14px;
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}
.sz-hd-left { display: flex; align-items: center; gap: 10px; min-width: 0; }

.sz-hd-ic {
  width: 34px; height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(139,92,246,.18), rgba(139,92,246,.12));
  border: 1px solid rgba(139,92,246,.2);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(139,92,246,.12);
}
.sz-hd-ic svg { width: 16px; height: 16px; color: #8b5cf6; }

.sz-hd-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--title);
  white-space: nowrap;
  overflow: hidden;
  letter-spacing: -.1px;
}

.sz-toggle {
  width: 28px; height: 28px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--mini-bg);
  color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s, color .15s, border-color .15s;
}
.sz-toggle:hover { background: rgba(139,92,246,.1); color: #8b5cf6; border-color: rgba(139,92,246,.25); }
.sz-toggle svg { width: 13px; height: 13px; }

/* Nav */
.sz-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: none;
}
.sz-nav::-webkit-scrollbar { display: none; }

.sz-grp-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--muted);
  padding: 10px 10px 5px;
  white-space: nowrap;
  opacity: .7;
}

.sz-sep {
  height: 1px;
  background: var(--card-border);
  margin: 6px 4px 4px;
  opacity: .6;
}

/* Nav item */
.sz-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  transition: background .13s, color .13s;
}
.sz-item:hover:not(.sz-item--on) {
  background: var(--mini-bg);
  color: var(--body);
}
.sz-item--on {
  background: var(--mini-bg);
  color: var(--title);
  font-weight: 600;
}

/* Icon */
.sz-ic {
  width: 30px; height: 30px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background .15s, box-shadow .15s, color .15s;
  background: var(--mini-bg);
  color: var(--muted);
}
.sz-ic svg { width: 14px; height: 14px; }
.sz-item:hover:not(.sz-item--on) .sz-ic { color: var(--body); }

.sz-lbl { flex: 1; overflow: hidden; text-overflow: ellipsis; }

/* Active dot */
.sz-active-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  opacity: .5;
}

/* Active left bar */
.sz-bar {
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 18px;
  border-radius: 0 3px 3px 0;
  box-shadow: 1px 0 6px currentColor;
}

/* ── Content ─────────────────────────────────────────────────────────────────── */
.sz-main {
  overflow-y: auto;
  padding: 24px;
  background: var(--bg, var(--main-bg, #f0f4ff));
  scrollbar-width: thin;
  scrollbar-color: var(--card-border) transparent;
}

/* Empty state */
.sz-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 14px;
}
.sz-empty-ic {
  width: 64px; height: 64px;
  border-radius: 18px;
  background: var(--mini-bg);
  border: 1px solid var(--card-border);
  display: flex; align-items: center; justify-content: center;
}
.sz-empty-ic svg { width: 30px; height: 30px; color: var(--muted); opacity: .5; }
.sz-empty-title { font-size: 15px; font-weight: 700; color: var(--title); margin: 0; }
.sz-empty-sub   { font-size: 13px; color: var(--muted); margin: 0; }

/* Loading */
.sz-loading { display: flex; align-items: center; justify-content: center; height: 200px; }
.sz-spin {
  width: 26px; height: 26px;
  border: 2.5px solid var(--card-border);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Transition */
.sz-fade-enter-active, .sz-fade-leave-active { transition: opacity .15s, transform .15s; }
.sz-fade-enter-from, .sz-fade-leave-to { opacity: 0; transform: translateX(-4px); }
</style>
