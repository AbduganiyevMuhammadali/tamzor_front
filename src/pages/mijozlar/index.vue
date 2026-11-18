<template>
  <div class="mj-page">

    <!-- ── Header ──────────────────────────────────────────────────── -->
    <div class="mj-header">
      <div>
        <h2 class="mj-title">Mijozlar</h2>
        <p class="mj-sub">{{ total }} ta mijoz ro'yxatda</p>
      </div>
      <div class="mj-header-right">
        <div class="mj-view-tog">
          <button class="mj-vt" :class="{ 'mj-vt--on': view === 'list' }" @click="view = 'list'" title="Ro'yxat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button class="mj-vt" :class="{ 'mj-vt--on': view === 'map' }" @click="view = 'map'" title="Xarita">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          </button>
        </div>
        <button class="mj-imp-btn" @click="showImport = true" title="Excel yoki CSV ro'yxatdan mijozlarni yuklash">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Excel'dan yuklash
        </button>
        <button class="mj-add-btn" @click="openCreate">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi mijoz
        </button>
      </div>
    </div>

    <MijozImport v-if="showImport" @yopildi="importYopildi" />

    <!-- ── KPI ───────────────────────────────────────────────────────── -->
    <div class="mj-kpis" v-if="reytingXulosa">
      <div class="mj-kpi">
        <span class="mj-kpi-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        <div class="mj-kpi-mat"><b>{{ reytingXulosa.jami }}</b><span>Faol mijozlar</span></div>
      </div>
      <button class="mj-kpi mj-kpi--btn" :class="{ 'mj-kpi--on': fQarz }" @click="fQarz = !fQarz; page = 1; load()" title="Faqat qarzdorlarni ko'rsatish">
        <span class="mj-kpi-ic mj-kpi-ic--qizil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg></span>
        <div class="mj-kpi-mat"><b>{{ reytingXulosa.qarzdor }}</b><span>Qarzdor · {{ qisqa(reytingXulosa.qarz) }} so'm</span></div>
      </button>
      <div class="mj-kpi">
        <span class="mj-kpi-ic" :style="{ color: darajaOl(reytingXulosa.ortacha).rang, background: darajaOl(reytingXulosa.ortacha).fon }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
        <div class="mj-kpi-mat"><b>{{ reytingXulosa.ortacha }}<small>/200</small></b><span>O'rtacha reyting · {{ darajaOl(reytingXulosa.ortacha).nom }}</span></div>
      </div>
      <button class="mj-kpi mj-kpi--btn" :class="{ 'mj-kpi--on': fReyting === 'diqqat' }" @click="fReyting = fReyting === 'diqqat' ? '' : 'diqqat'; page = 1; load()" title="Past va Kritik darajadagi mijozlar">
        <span class="mj-kpi-ic mj-kpi-ic--sariq"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <div class="mj-kpi-mat"><b>{{ diqqatSoni }}</b><span>Diqqat talab<template v-if="reytingXulosa.vada_otgan"> · {{ reytingXulosa.vada_otgan }} va'da o'tgan</template></span></div>
      </button>
    </div>

    <!-- ── Reyting taqsimoti: chiziq + bosiladigan darajalar ─────────── -->
    <div class="mj-dist" v-if="view === 'list' && reytingXulosa && reytingXulosa.jami">
      <div class="mj-dist-hd">
        <span class="mj-dist-t">Reyting taqsimoti</span>
        <div class="mj-dist-legend">
          <button v-for="d in reytingXulosa.darajalar" :key="d.kod" class="mj-dist-l" :class="{ 'mj-dist-l--on': fReyting === d.kod, 'mj-dist-l--nol': !d.soni }"
            :style="{ '--r': darajaKod(d.kod).rang, '--f': darajaKod(d.kod).fon }" @click="fReyting = fReyting === d.kod ? '' : d.kod; page = 1; load()">
            <i/>{{ d.nom }}<b>{{ d.soni }}</b>
          </button>
        </div>
      </div>
      <div class="mj-dist-bar">
        <span v-for="d in reytingXulosa.darajalar.filter(x => x.soni)" :key="d.kod" :style="{ flex: d.soni, background: darajaKod(d.kod).rang }"
          :title="`${d.nom}: ${d.soni} ta mijoz`" :class="{ 'mj-dist-seg--off': fReyting && fReyting !== d.kod && !(fReyting === 'diqqat' && (d.kod === 'past' || d.kod === 'kritik')) }"/>
      </div>
    </div>

    <!-- ── Filters ─────────────────────────────────────────────────── -->
    <div class="mj-filters">
      <div class="mj-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="fSearch" placeholder="Nomi, telefon..." class="mj-search-in" @input="page = 1; load()"/>
        <button v-if="fSearch" class="mj-search-x" @click="fSearch=''; load()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="mj-fsel-wrap" :class="{ on: fTerritoriya }">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <select class="mj-fsel" v-model="fTerritoriya" @change="page=1; load()">
          <option value="">Hudud</option>
          <option v-for="t in sprav.territoriyalar" :key="t.id" :value="t.id">{{ t.nomi }}</option>
        </select>
      </div>
      <div class="mj-fsel-wrap" :class="{ on: fKategoriya }">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        <select class="mj-fsel" v-model="fKategoriya" @change="page=1; load()">
          <option value="">Kategoriya</option>
          <option v-for="k in sprav.kategoriyalar" :key="k.id" :value="k.id">{{ k.nomi }}</option>
        </select>
      </div>
      <div class="mj-fsel-wrap" :class="{ on: fAgent }">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <select class="mj-fsel" v-model="fAgent" @change="page=1; load()">
          <option value="">Agent</option>
          <option v-for="a in sprav.agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option>
        </select>
      </div>
      <!-- Kanal: distributsiya mijozi (agent zakaz oladi, dostavchik yetkazadi) yoki Won Sell mijozi (agent mashinadan sotadi) -->
      <div class="mj-fsel-wrap" :class="{ on: fKanal }">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        <select class="mj-fsel" v-model="fKanal" @change="page=1; load()">
          <option value="">Kanal</option>
          <option value="distributsiya">Distributsiya</option>
          <option value="avtolavka">Won Sell</option>
        </select>
      </div>
      <div class="mj-fsel-wrap" :class="{ on: fSinf }">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
        <select class="mj-fsel" v-model="fSinf" @change="page=1; load()">
          <option value="">Sinf</option>
          <option value="A">A sinf</option>
          <option value="B">B sinf</option>
          <option value="C">C sinf</option>
          <option value="D">D sinf</option>
        </select>
      </div>
      <div class="mj-fsel-wrap" :class="{ on: fFaol }">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
        <select class="mj-fsel" v-model="fFaol" @change="page=1; load()">
          <option value="">Holat</option>
          <option value="true">Faol</option>
          <option value="false">Nofaol</option>
        </select>
      </div>
      <button class="mj-clear-btn" v-if="hasFilter" @click="clearFilters">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Tozalash
      </button>
    </div>

    <!-- ── LIST VIEW ───────────────────────────────────────────────── -->
    <template v-if="view === 'list'">
      <div class="mj-table-wrap">
        <div class="mj-loading" v-if="loading"><div class="mj-spinner"/></div>
        <div class="mj-table-scroll" v-else>
        <table class="mj-table">
          <thead>
            <tr>
              <th class="td-num">#</th>
              <th>Mijoz</th>
              <th>
                <button class="mj-th-sort" :class="{ on: fTartib }" @click="tartibAlmashtir" :title="fTartib === 'reyting' ? 'Eng pastdan' : fTartib === 'reyting_desc' ? 'Eng yuqoridan' : 'Reyting bo\'yicha saralash'">
                  Reyting
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path v-if="fTartib === 'reyting'" d="M12 5v14M6 13l6 6 6-6"/><path v-else-if="fTartib === 'reyting_desc'" d="M12 19V5M6 11l6-6 6 6"/>
                    <path v-else d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
                  </svg>
                </button>
              </th>
              <th class="col-hud">Hudud</th>
              <th>Agent</th>
              <th class="th-c col-sinf">Sinf</th>
              <th class="th-r">Balans</th>
              <th>Holat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rows.length === 0">
              <td colspan="9" class="mj-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                <p>Mijoz topilmadi</p>
                <button class="mj-add-btn mj-add-btn--sm" @click="hasFilter ? clearFilters() : openCreate()">{{ hasFilter ? 'Filtrlarni tozalash' : "+ Qo'shish" }}</button>
              </td>
            </tr>
            <tr v-for="(m, i) in rows" :key="m.id" class="mj-tr" @click="openDetail(m)">
              <td class="td-num">{{ (page - 1) * perPage + i + 1 }}</td>
              <td>
                <div class="mj-name-cell">
                  <div class="mj-av" :style="{ background: avRang(m.id) }">{{ m.nomi?.charAt(0)?.toUpperCase() }}</div>
                  <div class="mj-name-mat">
                    <div class="mj-nomi">{{ m.nomi }}</div>
                    <div class="mj-yuridik">{{ [m.telefon, m.yuridik_nomi].filter(Boolean).join(' · ') || '—' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="mj-ry" :style="{ '--r': darajaOl(m.reyting).rang, '--f': darajaOl(m.reyting).fon }" :title="`Reyting ${m.reyting ?? 100}/200 — ${darajaOl(m.reyting).nom}`">
                  <div class="mj-ry-top"><b>{{ m.reyting ?? 100 }}</b><span>{{ darajaOl(m.reyting).nom }}</span></div>
                  <div class="mj-ry-bar"><i :style="{ width: Math.max(3, Math.min(100, (m.reyting ?? 100) / 2)) + '%' }"/></div>
                </div>
              </td>
              <td class="col-hud">
                <div class="mj-stack">
                  <span class="mj-tag mj-tag--geo" v-if="m.territoriya">{{ m.territoriya.nomi }}</span>
                  <span class="mj-dash" v-else>—</span>
                  <span class="mj-stack-sub" v-if="m.kategoriya">{{ m.kategoriya.nomi }}</span>
                </div>
              </td>
              <td>
                <div class="mj-agent-cell" v-if="m.agent">
                  <div class="mj-agent-av">{{ m.agent.fullname?.charAt(0) }}</div>
                  <div class="mj-stack">
                    <span class="mj-agent-nom">{{ m.agent.fullname }}</span>
                    <span class="mj-kanal" :class="m.agent.avtolavka ? 'mj-kanal--avto' : 'mj-kanal--dist'" :title="m.agent.avtolavka ? 'Won Sell mijozi — agent mashinadan sotadi' : 'Distributsiya mijozi — agent zakaz oladi, dostavchik yetkazadi'">{{ m.agent.avtolavka ? 'Won Sell' : 'distributsiya' }}</span>
                  </div>
                </div>
                <span class="mj-dash" v-else>—</span>
              </td>
              <td class="th-c col-sinf">
                <span class="mj-sinf" :style="{ background: sinfColor(m.sinf)+'18', color: sinfColor(m.sinf) }" v-if="m.sinf">{{ m.sinf }}</span>
                <span class="mj-dash" v-else>—</span>
              </td>
              <td class="td-r">
                <span class="mj-balans" :class="balansClass(m.balans)" :title="balansMatn(m.balans)">{{ formatSum(m.balans) }}</span>
                <div v-if="parseFloat(m.balans) !== 0" class="mj-balans-sub">{{ parseFloat(m.balans) < 0 ? 'qarzdor' : 'haqdor' }}<template v-if="m.tolov_vada_sana && parseFloat(m.balans) < 0"> · va'da {{ vadaMatn(m.tolov_vada_sana) }}</template></div>
              </td>
              <td>
                <span class="mj-faol" :class="m.faol ? 'on' : 'off'"><i/>{{ m.faol ? 'Faol' : 'Nofaol' }}</span>
              </td>
              <td class="td-act" @click.stop>
                <div class="mj-acts">
                  <button class="mj-act mj-act--edit" @click="openEdit(m)" title="Tahrirlash">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="mj-act mj-act--del" @click="deleteMijoz(m)" title="O'chirish">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <div class="mj-pg" v-if="!loading && total > 0">
          <span class="pg-info">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} / <strong>{{ total }}</strong> ta</span>
          <div class="pg-btns">
            <button class="pg-btn" :disabled="page === 1" @click="changePage(page - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-for="p in pageRange" :key="p" class="pg-btn" :class="{ 'pg-btn--on': p === page }" @click="changePage(p)">{{ p }}</button>
            <button class="pg-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── MAP VIEW ────────────────────────────────────────────────── -->
    <template v-else>
      <div class="mj-map-wrap">
        <div id="mj-leaflet-map" class="mj-map-container"/>
        <div class="mj-map-sidebar">
          <div class="mj-map-sb-head">
            <span>{{ mapRows.length }} ta (lokatsiyali)</span>
            <select class="mj-fsel mj-fsel--sm" v-model="fTerritoriya" @change="loadAll">
              <option value="">Barcha hududlar</option>
              <option v-for="t in sprav.territoriyalar" :key="t.id" :value="t.id">{{ t.nomi }}</option>
            </select>
          </div>
          <div class="mj-map-list">
            <div
              class="mj-map-item"
              v-for="m in mapRows" :key="m.id"
              :class="{ 'mj-map-item--on': mapSelected === m.id }"
              @click="selectMapMijoz(m)"
            >
              <div class="mj-av mj-av--sm" :style="{ background: avRang(m.id) }">{{ m.nomi?.charAt(0) }}</div>
              <div class="mj-map-info">
                <div class="mj-nomi">{{ m.nomi }}</div>
                <div class="mj-yuridik">{{ m.territoriya?.nomi || '—' }}</div>
              </div>
              <span class="mj-sinf mj-sinf--sm" :style="{ background: sinfColor(m.sinf)+'18', color: sinfColor(m.sinf) }">{{ m.sinf || '?' }}</span>
            </div>
            <div class="mj-empty" v-if="mapRows.length === 0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
              <p>Lokatsiyali mijoz yo'q</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ── DETAIL PANEL ────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="mj-slide">
        <div v-if="detailMijoz" class="mj-panel-overlay" @click.self="detailMijoz = null">
          <div class="mj-panel">
            <div class="mj-panel-hd">
              <div class="mj-panel-av" :style="{ background: avRang(detailMijoz.id) }">{{ detailMijoz.nomi?.charAt(0)?.toUpperCase() }}</div>
              <div class="mj-panel-info">
                <h3 class="mj-panel-name">{{ detailMijoz.nomi }}</h3>
                <p class="mj-panel-sub">{{ detailMijoz.yuridik_nomi || detailMijoz.telefon || '—' }}</p>
                <div class="mj-panel-badges">
                  <span class="mj-sinf" :style="{ background: sinfColor(detailMijoz.sinf)+'18', color: sinfColor(detailMijoz.sinf) }" v-if="detailMijoz.sinf">{{ detailMijoz.sinf }}</span>
                  <span class="mj-panel-ry" :style="{ color: darajaOl(detailMijoz.reyting).rang, background: darajaOl(detailMijoz.reyting).fon }" :title="'Reyting ' + (detailMijoz.reyting ?? 100)">{{ detailMijoz.reyting ?? 100 }} · {{ darajaOl(detailMijoz.reyting).nom }}</span>
                  <span class="mj-faol" :class="detailMijoz.faol ? 'on' : 'off'"><i/>{{ detailMijoz.faol ? 'Faol' : 'Nofaol' }}</span>
                </div>
              </div>
              <div class="mj-panel-actions">
                <button class="mj-act mj-act--edit" @click="openEdit(detailMijoz)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="mj-panel-close" @click="detailMijoz = null">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <div class="mj-balans-strip" :class="balansClass(detailMijoz.balans)">
              <span>{{ balansMatn(detailMijoz.balans) }}:</span>
              <strong>{{ formatSum(detailMijoz.balans) }} so'm</strong>
            </div>

            <!-- Kredit limit holati (limit>0 bo'lsagina ko'rinadi) -->
            <div class="mj-kredit-strip" v-if="parseFloat(detailMijoz.kredit_limit) > 0">
              <div class="mj-kredit-top">
                <span>Kredit limit</span>
                <span class="mj-kredit-nums">
                  {{ formatSum(Math.max(0, -detailMijoz.balans)) }} / {{ formatSum(detailMijoz.kredit_limit) }} so'm
                </span>
              </div>
              <div class="mj-kredit-bar">
                <div class="mj-kredit-fill" :class="kreditFoiz(detailMijoz) >= 100 && 'over'"
                  :style="{ width: Math.min(100, kreditFoiz(detailMijoz)) + '%' }"/>
              </div>
              <div class="mj-kredit-note" v-if="kreditFoiz(detailMijoz) >= 100">
                ⛔ Limit to'lgan — yangi zakaz bloklanadi
              </div>
            </div>

            <div class="mj-panel-body">
              <div class="mj-panel-section">
                <ReytingPanel :mijoz-id="detailMijoz.id" @ozgardi="reytingOzgardi"/>
              </div>

              <div class="mj-panel-section">
                <div class="mj-section-title">Asosiy ma'lumotlar</div>
                <div class="mj-kv-grid">
                  <div class="mj-kv"><span class="mj-k">Telefon</span><span class="mj-v">{{ detailMijoz.telefon || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Telefon 2</span><span class="mj-v">{{ detailMijoz.telefon2 || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Manzil</span><span class="mj-v">{{ detailMijoz.manzil || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Mo'ljal</span><span class="mj-v">{{ detailMijoz.mo_ljal || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Hudud</span><span class="mj-v">{{ detailMijoz.territoriya?.nomi || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Kategoriya</span><span class="mj-v">{{ detailMijoz.kategoriya?.nomi || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Agent</span><span class="mj-v">{{ detailMijoz.agent?.fullname || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Kanal</span><span class="mj-v">{{ detailMijoz.agent ? (detailMijoz.agent.avtolavka ? 'Won Sell — mashinadan sotuv' : 'Distributsiya — zakaz, dostavchik yetkazadi') : '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Tashrif kunlari</span><span class="mj-v">{{ detailMijoz.tashrif_kunlari || '—' }}</span></div>
                </div>
              </div>

              <div class="mj-panel-section" v-if="detailMijoz.inn || detailMijoz.shartnoma_raqam">
                <div class="mj-section-title">Yuridik ma'lumotlar</div>
                <div class="mj-kv-grid">
                  <div class="mj-kv"><span class="mj-k">INN</span><span class="mj-v">{{ detailMijoz.inn || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Shartnoma</span><span class="mj-v">{{ detailMijoz.shartnoma_raqam || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Shartnoma sana</span><span class="mj-v">{{ detailMijoz.shartnoma_sana || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Hisob raqam</span><span class="mj-v">{{ detailMijoz.hisob_raqam || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Bank</span><span class="mj-v">{{ detailMijoz.bank || '—' }}</span></div>
                  <div class="mj-kv"><span class="mj-k">MFO</span><span class="mj-v">{{ detailMijoz.mfo || '—' }}</span></div>
                </div>
              </div>

              <div class="mj-panel-section" v-if="detailMijoz.lat && detailMijoz.lng">
                <div class="mj-section-title">Lokatsiya</div>
                <div class="mj-kv-grid">
                  <div class="mj-kv"><span class="mj-k">Kenglik</span><span class="mj-v">{{ detailMijoz.lat }}</span></div>
                  <div class="mj-kv"><span class="mj-k">Uzunlik</span><span class="mj-v">{{ detailMijoz.lng }}</span></div>
                </div>
              </div>

              <div class="mj-panel-section" v-if="detailMijoz.izoh">
                <div class="mj-section-title">Izoh</div>
                <p class="mj-izoh">{{ detailMijoz.izoh }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── CREATE / EDIT MODAL ─────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="mj-fade">
        <div v-if="showModal" class="mj-modal-overlay" @click.self="showModal = false">
          <div class="mj-modal">

            <div class="mj-modal-hd">
              <div class="mj-modal-ic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h3 class="mj-modal-title">{{ editId ? 'Mijozni tahrirlash' : 'Yangi mijoz' }}</h3>
                <p class="mj-modal-sub">Barcha * maydonlar majburiy</p>
              </div>
              <button class="mj-modal-close" @click="showModal = false">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="mj-modal-tabs">
              <button class="mj-mtab" :class="{ 'mj-mtab--on': formTab === 'main' }" @click="formTab = 'main'">Asosiy</button>
              <button class="mj-mtab" :class="{ 'mj-mtab--on': formTab === 'extra' }" @click="formTab = 'extra'">Yuridik</button>
              <button class="mj-mtab" :class="{ 'mj-mtab--on': formTab === 'visit' }" @click="formTab = 'visit'">Tashrif & Lokatsiya</button>
              <button class="mj-mtab" :class="{ 'mj-mtab--on': formTab === 'qoldiq', 'mj-mtab--dot': form.boshlangich_yon !== 'yoq' }" @click="formTab = 'qoldiq'">Boshlang'ich qoldiq</button>
            </div>

            <div class="mj-modal-body">

              <!-- TAB: Asosiy -->
              <div v-show="formTab === 'main'" class="mj-form-grid">
                <div class="mj-fg mj-fg--full">
                  <label>Nomi <span class="req">*</span></label>
                  <input type="text" v-model="form.nomi" class="mj-inp" placeholder="Mijoz nomi"/>
                </div>
                <div class="mj-fg mj-fg--full">
                  <label>Yuridik nomi</label>
                  <input type="text" v-model="form.yuridik_nomi" class="mj-inp" placeholder="OAJ, MCHJ..."/>
                </div>
                <div class="mj-fg">
                  <label>Telefon</label>
                  <input type="text" v-model="form.telefon" class="mj-inp" placeholder="+998 90 000 00 00"/>
                </div>
                <div class="mj-fg">
                  <label>Telefon 2</label>
                  <input type="text" v-model="form.telefon2" class="mj-inp" placeholder="+998 90 000 00 00"/>
                </div>
                <div class="mj-fg mj-fg--full">
                  <label>Manzil</label>
                  <input type="text" v-model="form.manzil" class="mj-inp" placeholder="Ko'cha, uy raqami..."/>
                </div>
                <div class="mj-fg mj-fg--full">
                  <label>Mo'ljal</label>
                  <input type="text" v-model="form.mo_ljal" class="mj-inp" placeholder="Yaqin belgi, orientir..."/>
                </div>
                <div class="mj-fg">
                  <label>Hudud (Territoriya)</label>
                  <div class="mj-sel-wrap">
                    <svg class="mj-sel-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <select v-model="form.territoriya_id" class="mj-inp mj-inp--sel">
                      <option :value="null">— Hudud tanlang —</option>
                      <option v-for="t in sprav.territoriyalar" :key="t.id" :value="t.id">{{ t.nomi }}</option>
                    </select>
                    <svg class="mj-sel-arr" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <span v-if="form.territoriya_id" class="mj-sel-chip mj-sel-chip--geo">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ sprav.territoriyalar.find(t => t.id == form.territoriya_id)?.nomi }}
                  </span>
                </div>
                <div class="mj-fg">
                  <label>Kategoriya</label>
                  <div class="mj-sel-wrap">
                    <svg class="mj-sel-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    <select v-model="form.kategoriya_id" class="mj-inp mj-inp--sel">
                      <option :value="null">— Kategoriya tanlang —</option>
                      <option v-for="k in sprav.kategoriyalar" :key="k.id" :value="k.id">{{ k.nomi }}</option>
                    </select>
                    <svg class="mj-sel-arr" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <span v-if="form.kategoriya_id" class="mj-sel-chip mj-sel-chip--kat">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    {{ sprav.kategoriyalar.find(k => k.id == form.kategoriya_id)?.nomi }}
                  </span>
                </div>
                <div class="mj-fg">
                  <label>Agent</label>
                  <div class="mj-sel-wrap">
                    <svg class="mj-sel-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <select v-model="form.agent_id" class="mj-inp mj-inp--sel">
                      <option :value="null">— Agent tanlang —</option>
                      <option v-for="a in sprav.agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option>
                    </select>
                    <svg class="mj-sel-arr" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <span v-if="form.agent_id" class="mj-sel-chip mj-sel-chip--agent">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {{ sprav.agentlar.find(a => a.id == form.agent_id)?.fullname }}
                  </span>
                </div>
                <div class="mj-fg">
                  <label>Mijoz sinfi</label>
                  <div class="mj-sinf-group">
                    <label v-for="s in ['A','B','C','D']" :key="s"
                      class="mj-sinf-radio"
                      :class="{ 'mj-sinf-radio--on': form.sinf === s }"
                      :style="form.sinf === s ? { borderColor: sinfColor(s), background: sinfColor(s)+'15', color: sinfColor(s) } : {}"
                    >
                      <input type="radio" :value="s" v-model="form.sinf" style="display:none"/>
                      {{ s }}
                    </label>
                    <label class="mj-sinf-radio" :class="{ 'mj-sinf-radio--on': !form.sinf }" style="font-size:18px">
                      <input type="radio" :value="null" v-model="form.sinf" style="display:none"/>—
                    </label>
                  </div>
                </div>
                <div class="mj-fg">
                  <label>Narx turi</label>
                  <div class="mj-toggle">
                    <button type="button" class="mj-tog-btn" :class="{ 'on': form.narx_turi === 'chakana' }" @click="form.narx_turi = 'chakana'">Chakana</button>
                    <button type="button" class="mj-tog-btn" :class="{ 'on': form.narx_turi === 'optom' }" @click="form.narx_turi = 'optom'">Optom</button>
                  </div>
                </div>
                <div class="mj-fg">
                  <label>Holat</label>
                  <div class="mj-toggle">
                    <button type="button" class="mj-tog-btn" :class="{ 'on': form.faol }" @click="form.faol = true">Faol</button>
                    <button type="button" class="mj-tog-btn" :class="{ 'off': !form.faol }" @click="form.faol = false">Nofaol</button>
                  </div>
                </div>
                <div class="mj-fg mj-fg--full">
                  <label>Izoh</label>
                  <textarea v-model="form.izoh" class="mj-inp mj-ta" rows="2" placeholder="Ixtiyoriy..."/>
                </div>
              </div>

              <!-- TAB: Boshlang'ich qoldiq (tizimga o'tishdan oldingi hisob) -->
              <div v-show="formTab === 'qoldiq'" class="mj-qoldiq">
                <p class="mj-qoldiq-hint">Tizimga o'tishdan oldingi hisob. Mijoz sizdan qarzdor bo'lsa — <b>Mijoz qarzdor</b>. Siz mijozga qarz bo'lsangiz (oldindan to'lagan, ortiqcha bergan) — <b>Biz qarzdormiz</b>. Keyingi savdo va to'lovlar shu qoldiqdan davom etadi, ko'chirmada birinchi qator bo'lib ko'rinadi.</p>
                <div class="mj-qoldiq-yon">
                  <button type="button" :class="{ on: form.boshlangich_yon === 'yoq' }" @click="form.boshlangich_yon = 'yoq'">Qoldiq yo'q</button>
                  <button type="button" class="neg" :class="{ on: form.boshlangich_yon === 'qarzdor' }" @click="form.boshlangich_yon = 'qarzdor'">Mijoz qarzdor</button>
                  <button type="button" class="pos" :class="{ on: form.boshlangich_yon === 'haqdor' }" @click="form.boshlangich_yon = 'haqdor'">Biz qarzdormiz · mijoz haqdor</button>
                </div>
                <div v-if="form.boshlangich_yon !== 'yoq'" class="mj-form-grid">
                  <div class="mj-fg"><label>Summa (so'm) *</label><NumberInput v-model="form.boshlangich_summa" css-class="mj-inp" placeholder="0"/></div>
                  <div class="mj-fg"><label>Qaysi sanaga</label><input type="date" v-model="form.boshlangich_sana" class="mj-inp"/></div>
                  <div class="mj-fg mj-fg--full"><label>Izoh</label><input type="text" v-model="form.boshlangich_izoh" class="mj-inp" maxlength="255" placeholder="Masalan: eski daftar bo'yicha"/></div>
                </div>
                <div v-if="form.boshlangich_yon !== 'yoq' && form.boshlangich_summa > 0" class="mj-qoldiq-nat" :class="form.boshlangich_yon === 'qarzdor' ? 'neg' : 'pos'">
                  <template v-if="form.boshlangich_yon === 'qarzdor'">Mijoz bizdan <b>{{ formatSum(form.boshlangich_summa) }} so'm</b> qarzdor bo'lib boshlaydi</template>
                  <template v-else>Biz mijozga <b>{{ formatSum(form.boshlangich_summa) }} so'm</b> qarzdor bo'lib boshlaymiz</template>
                </div>
                <div v-if="editId" class="mj-qoldiq-joriy">
                  Joriy balans: <b :class="balansClass(joriyBalans)">{{ formatSum(joriyBalans) }} so'm</b>
                  <template v-if="Math.abs(qoldiqFarqi) > 0.5"> · saqlansa <b :class="balansClass(joriyBalans + qoldiqFarqi)">{{ formatSum(joriyBalans + qoldiqFarqi) }} so'm</b> bo'ladi — savdo va to'lovlar tarixi o'z joyida qoladi</template>
                </div>
              </div>

              <!-- TAB: Yuridik -->
              <div v-show="formTab === 'extra'" class="mj-form-grid">
                <div class="mj-fg"><label>INN</label><input type="text" v-model="form.inn" class="mj-inp" placeholder="123456789"/></div>
                <div class="mj-fg"><label>Shartnoma raqami</label><input type="text" v-model="form.shartnoma_raqam" class="mj-inp" placeholder="SH-001"/></div>
                <div class="mj-fg"><label>Shartnoma sanasi</label><input type="date" v-model="form.shartnoma_sana" class="mj-inp"/></div>
                <div class="mj-fg"><label>Hisob raqam</label><input type="text" v-model="form.hisob_raqam" class="mj-inp" placeholder="2020..."/></div>
                <div class="mj-fg"><label>Bank nomi</label><input type="text" v-model="form.bank" class="mj-inp" placeholder="Kapitalbank..."/></div>
                <div class="mj-fg"><label>MFO</label><input type="text" v-model="form.mfo" class="mj-inp" placeholder="01234"/></div>
                <div class="mj-fg">
                  <label>Kredit limit (so'm)</label>
                  <NumberInput v-model="form.kredit_limit" css-class="mj-inp" placeholder="0 = cheklovsiz"/>
                </div>
                <div class="mj-fg">
                  <label>To'lov muddati (kun)</label>
                  <input type="number" v-model.number="form.tolov_muddati_kun" class="mj-inp" placeholder="30" min="1"/>
                </div>
              </div>

              <!-- TAB: Tashrif & Lokatsiya -->
              <div v-show="formTab === 'visit'" class="mj-visit-tab">

                <!-- Tashrif qismi -->
                <div class="mj-visit-section">
                  <div class="mj-visit-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Tashrif jadvali
                  </div>
                  <div class="mj-visit-row">
                    <div class="mj-fg" style="flex:1">
                      <label>Tashrif kunlari</label>
                      <div class="mj-days">
                        <button type="button" class="mj-day-btn" v-for="d in WEEKDAYS" :key="d.val"
                          :class="{ 'mj-day-btn--on': selectedDays.includes(d.val) }"
                          @click="toggleDay(d.val)">{{ d.label }}</button>
                      </div>
                    </div>
                    <div class="mj-fg" style="width:180px;flex-shrink:0">
                      <label>Chastota</label>
                      <select v-model="form.tashrif_chastota" class="mj-inp">
                        <option value="">— Tanlang —</option>
                        <option>Har hafta</option>
                        <option>Har 2 haftada</option>
                        <option>Har oyda</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Lokatsiya qismi -->
                <div class="mj-visit-section">
                  <div class="mj-visit-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Lokatsiya — xaritada belgilang
                  </div>

                  <!-- Koordinatalar + tugmalar -->
                  <div class="mj-loc-coords">
                    <div class="mj-loc-coord-item">
                      <span class="mj-loc-coord-lbl">Kenglik (Lat)</span>
                      <input type="number" v-model="form.lat" class="mj-inp mj-inp--coord" placeholder="41.2995" step="0.0000001" @input="updatePickerMarker"/>
                    </div>
                    <div class="mj-loc-coord-sep">×</div>
                    <div class="mj-loc-coord-item">
                      <span class="mj-loc-coord-lbl">Uzunlik (Lng)</span>
                      <input type="number" v-model="form.lng" class="mj-inp mj-inp--coord" placeholder="69.2401" step="0.0000001" @input="updatePickerMarker"/>
                    </div>
                    <button type="button" class="mj-loc-my-btn" @click="useMyLocation" title="Joriy joylashuvni olish">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                      Joylashuv
                    </button>
                    <button type="button" class="mj-loc-clear-btn" v-if="form.lat || form.lng" @click="form.lat=''; form.lng=''; clearPickerMarker()">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  <!-- Xarita -->
                  <div class="mj-picker-map-wrap">
                    <div id="mj-picker-map" class="mj-picker-map"/>
                    <div class="mj-picker-hint" v-if="!form.lat && !form.lng">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      Xaritaga bosib joylashuvni belgilang
                    </div>
                    <div class="mj-picker-coords-badge" v-if="form.lat && form.lng">
                      {{ Number(form.lat).toFixed(5) }}, {{ Number(form.lng).toFixed(5) }}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <p class="mj-error" v-if="formError">{{ formError }}</p>

            <div class="mj-modal-foot">
              <button class="mj-btn-cancel" @click="showModal = false">Bekor qilish</button>
              <button class="mj-btn-save" @click="saveMijoz" :disabled="saving">
                <span class="mj-spinner mj-spinner--sm" v-if="saving"/>
                <span v-else>{{ editId ? 'Saqlash' : "Qo'shish" }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { api } from '@/api/api'
import { fonQatlam } from '@/utils/xarita'
import MijozImport from './MijozImport.vue'
import ReytingPanel from './ReytingPanel.vue'
import { DARAJALAR, darajaOl, darajaKod } from '@/utils/reyting'

const WEEKDAYS = ['Du','Se','Ch','Pa','Ju','Sh','Ya'].map(v => ({ val: v, label: v }))
const SINF_COLORS = { A: '#10b981', B: '#4f46e5', C: '#f59e0b', D: '#ef4444' }
function sinfColor(s) { return SINF_COLORS[s] || '#94a3b8' }
/* Avatarlar — brend tuslari (sinf rangi alohida belgida ko'rsatiladi) */
const AV_RANG = ['#4f46e5', '#6366f1', '#4338ca', '#3730a3']
const avRang = (id) => AV_RANG[(Number(id) || 0) % AV_RANG.length]

const view       = ref('list')
const rows       = ref([])
const mapRows    = ref([])
const total      = ref(0)
const loading    = ref(false)
const page       = ref(1)
const perPage    = 20
const totalPages = computed(() => Math.ceil(total.value / perPage) || 1)

const fSearch      = ref('')
const fTerritoriya = ref('')
const fKategoriya  = ref('')
const fAgent       = ref('')
const fSinf        = ref('')
const fKanal       = ref('')   // '' | distributsiya | avtolavka
const fFaol        = ref('')
const fReyting     = ref('')   // '' | alo | yaxshi | orta | past | kritik | diqqat (past + kritik)
const fQarz        = ref(false) // faqat qarzdorlar (KPI kartasi)
const fTartib      = ref('')   // '' | reyting (pastdan) | reyting_desc (yuqoridan)
const hasFilter    = computed(() => fSearch.value || fTerritoriya.value || fKategoriya.value || fAgent.value || fSinf.value || fFaol.value || fKanal.value || fReyting.value || fQarz.value)
const diqqatSoni   = computed(() => (reytingXulosa.value?.darajalar || []).filter(d => d.kod === 'past' || d.kod === 'kritik').reduce((s, d) => s + d.soni, 0))
function tartibAlmashtir() { fTartib.value = fTartib.value === '' ? 'reyting' : fTartib.value === 'reyting' ? 'reyting_desc' : ''; page.value = 1; load() }
const qisqa = (n) => { const v = Math.abs(Number(n) || 0); return v >= 1e9 ? (v / 1e9).toFixed(1).replace('.0', '') + ' mlrd' : v >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + ' mln' : v >= 1e3 ? Math.round(v / 1e3) + ' ming' : String(Math.round(v)) }
const OYLAR_Q = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']
const vadaMatn = (s) => { const d = new Date(s + 'T00:00:00'); return `${d.getDate()}-${OYLAR_Q[d.getMonth()]}` }
const reytingXulosa = ref(null)
async function loadXulosa() { try { reytingXulosa.value = await api.get('/mijozlar/reyting/xulosa') } catch { /* ixtiyoriy */ } }
/* Panelda admin ballni tuzatdi — ro'yxat qatori va xulosa yangilanadi */
function reytingOzgardi(e) {
  if (detailMijoz.value) detailMijoz.value.reyting = e.reyting
  const r = rows.value.find(x => x.id === detailMijoz.value?.id); if (r) r.reyting = e.reyting
  loadXulosa()
}

const sprav = ref({ territoriyalar: [], kategoriyalar: [], agentlar: [] })
const detailMijoz = ref(null)
const showModal   = ref(false)
const showImport  = ref(false)
const editId      = ref(null)
const saving      = ref(false)
const formError   = ref('')
const formTab     = ref('main')
const mapSelected = ref(null)
const selectedDays = ref([])

const emptyForm = () => ({
  nomi: '', yuridik_nomi: '', telefon: '', telefon2: '',
  manzil: '', mo_ljal: '', territoriya_id: null, kategoriya_id: null,
  agent_id: null, sinf: null, narx_turi: 'chakana', inn: '', shartnoma_raqam: '',
  shartnoma_sana: '', hisob_raqam: '', bank: '', mfo: '',
  kredit_limit: 0, tolov_muddati_kun: 30,
  tashrif_kunlari: '', tashrif_chastota: '',
  lat: '', lng: '', izoh: '', faol: true,
  // Boshlang'ich qoldiq: yo'nalish + summa → serverga ishorali boshlangich_balans ketadi
  boshlangich_yon: 'yoq', boshlangich_summa: 0, boshlangich_sana: '', boshlangich_izoh: '',
})
const form = ref(emptyForm())
const joriyBalans = ref(0)        // tahrirda: mijoz kartasidagi hozirgi balans
const eskiBoshlangich = ref(0)    // tahrirda: saqlangan boshlang'ich qoldiq
const yangiBoshlangich = computed(() => {
  const s = Math.abs(Number(form.value.boshlangich_summa) || 0)
  return form.value.boshlangich_yon === 'qarzdor' ? -s : form.value.boshlangich_yon === 'haqdor' ? s : 0
})
const qoldiqFarqi = computed(() => +(yangiBoshlangich.value - eskiBoshlangich.value).toFixed(2))
function balansMatn(b) { const n = parseFloat(b || 0); return n > 0 ? 'Mijoz haqdor — biz qarzdormiz' : n < 0 ? 'Mijoz qarzdor' : 'Hisob teng' }

const pageRange = computed(() => {
  const s = Math.max(1, page.value - 2)
  const e = Math.min(totalPages.value, s + 4)
  const arr = []
  for (let i = s; i <= e; i++) arr.push(i)
  return arr
})

async function loadSprav() {
  const d = await api.get('/mijozlar/spravochnik')
  sprav.value = d || { territoriyalar: [], kategoriyalar: [], agentlar: [] }
}

async function load() {
  loading.value = true
  try {
    const p = new URLSearchParams()
    p.set('page', page.value); p.set('limit', perPage)
    if (fSearch.value)      p.set('search', fSearch.value)
    if (fTerritoriya.value) p.set('territoriya_id', fTerritoriya.value)
    if (fKategoriya.value)  p.set('kategoriya_id', fKategoriya.value)
    if (fAgent.value)       p.set('agent_id', fAgent.value)
    if (fSinf.value)        p.set('sinf', fSinf.value)
    if (fKanal.value)       p.set('kanal', fKanal.value)
    if (fFaol.value !== '') p.set('faol', fFaol.value)
    if (fReyting.value)     p.set('reyting', fReyting.value)
    if (fQarz.value)        p.set('qarzdor', '1')
    if (fTartib.value)      p.set('tartib', fTartib.value)
    const d = await api.get('/mijozlar?' + p.toString())
    rows.value  = d.rows  || []
    total.value = d.count || 0
  } finally { loading.value = false }
}

async function loadAll() {
  const p = new URLSearchParams({ all: 'true' })
  if (fTerritoriya.value) p.set('territoriya_id', fTerritoriya.value)
  const d = await api.get('/mijozlar?' + p.toString())
  mapRows.value = (Array.isArray(d) ? d : []).filter(m => m.lat && m.lng)
  await nextTick(); renderMap()
}

function changePage(p) { page.value = p; load() }

function clearFilters() {
  fSearch.value = ''; fTerritoriya.value = ''; fKategoriya.value = ''
  fAgent.value  = ''; fSinf.value = ''; fFaol.value = ''; fKanal.value = ''; fReyting.value = ''; fQarz.value = false
  page.value = 1; load()
}

/* Excel import oynasi yopildi — saqlangan bo'lsa ro'yxat va spravochnik (yangi hudud/agent) qayta o'qiladi */
async function importYopildi(e) {
  showImport.value = false
  if (e?.saqlandi) { await loadSprav(); page.value = 1; await load() }
}

function openCreate() {
  editId.value = null; form.value = emptyForm()
  joriyBalans.value = 0; eskiBoshlangich.value = 0
  selectedDays.value = []; formError.value = ''
  formTab.value = 'main'; showModal.value = true
}

function openEdit(m) {
  editId.value = m.id
  form.value = {
    nomi: m.nomi || '', yuridik_nomi: m.yuridik_nomi || '',
    telefon: m.telefon || '', telefon2: m.telefon2 || '',
    manzil: m.manzil || '', mo_ljal: m.mo_ljal || '',
    territoriya_id: m.territoriya_id || null,
    kategoriya_id:  m.kategoriya_id  || null,
    agent_id:       m.agent_id       || null,
    sinf: m.sinf || null,
    narx_turi: m.narx_turi || 'chakana',
    inn: m.inn || '', shartnoma_raqam: m.shartnoma_raqam || '',
    shartnoma_sana: m.shartnoma_sana || '',
    hisob_raqam: m.hisob_raqam || '', bank: m.bank || '', mfo: m.mfo || '',
    kredit_limit: parseFloat(m.kredit_limit) || 0,
    tolov_muddati_kun: parseInt(m.tolov_muddati_kun) || 30,
    tashrif_kunlari: m.tashrif_kunlari || '',
    tashrif_chastota: m.tashrif_chastota || '',
    lat: m.lat || '', lng: m.lng || '',
    izoh: m.izoh || '', faol: m.faol !== false,
    boshlangich_yon: parseFloat(m.boshlangich_balans || 0) < 0 ? 'qarzdor' : parseFloat(m.boshlangich_balans || 0) > 0 ? 'haqdor' : 'yoq',
    boshlangich_summa: Math.abs(parseFloat(m.boshlangich_balans || 0)),
    boshlangich_sana: m.boshlangich_sana || '', boshlangich_izoh: m.boshlangich_izoh || '',
  }
  joriyBalans.value = parseFloat(m.balans || 0); eskiBoshlangich.value = parseFloat(m.boshlangich_balans || 0)
  selectedDays.value = m.tashrif_kunlari ? m.tashrif_kunlari.split(',').map(s => s.trim()).filter(Boolean) : []
  formError.value = ''; formTab.value = 'main'
  showModal.value = true; detailMijoz.value = null
}

async function saveMijoz() {
  if (!form.value.nomi?.trim()) { formError.value = 'Nomi majburiy'; return }
  if (form.value.boshlangich_yon !== 'yoq' && !(Number(form.value.boshlangich_summa) > 0)) { formTab.value = 'qoldiq'; formError.value = "Boshlang'ich qoldiq summasini kiriting yoki «Qoldiq yo'q» ni tanlang"; return }
  saving.value = true; formError.value = ''
  try {
    const body = { ...form.value }
    body.boshlangich_balans = yangiBoshlangich.value
    body.boshlangich_sana = form.value.boshlangich_sana || null
    body.boshlangich_izoh = form.value.boshlangich_izoh?.trim() || null
    delete body.boshlangich_yon; delete body.boshlangich_summa
    body.tashrif_kunlari = selectedDays.value.join(', ') || null
    if (!body.territoriya_id) body.territoriya_id = null
    if (!body.kategoriya_id)  body.kategoriya_id  = null
    if (!body.agent_id)       body.agent_id       = null
    if (!body.sinf)           body.sinf           = null
    if (body.lat === '' || body.lat === null) body.lat = null
    if (body.lng === '' || body.lng === null) body.lng = null
    if (editId.value) { await api.patch(`/mijozlar/${editId.value}`, body) }
    else              { await api.post('/mijozlar', body) }
    showModal.value = false
    await loadSprav()
    await load()
  } catch (e) {
    formError.value = e.message || 'Xatolik'
  } finally { saving.value = false }
}

async function deleteMijoz(m) {
  if (!confirm(`"${m.nomi}" ni o'chirmoqchimisiz?`)) return
  await api.delete(`/mijozlar/${m.id}`)
  if (detailMijoz.value?.id === m.id) detailMijoz.value = null
  await load()
}

function openDetail(m) { detailMijoz.value = m }
function toggleDay(d) {
  const i = selectedDays.value.indexOf(d)
  if (i >= 0) selectedDays.value.splice(i, 1)
  else        selectedDays.value.push(d)
}

function formatSum(v) { if (!v) return '0'; return Number(v).toLocaleString('uz-UZ') }
function balansClass(b) { const n = parseFloat(b || 0); return n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero' }
function kreditFoiz(m) {
  const limit = parseFloat(m?.kredit_limit) || 0
  if (limit <= 0) return 0
  const qarz = Math.max(0, -parseFloat(m?.balans || 0))
  return +((qarz / limit) * 100).toFixed(1)
}

/* ── Picker Map (modal ichida lokatsiya tanlash) ── */
let pickerMap    = null
let pickerMarker = null

async function initPickerMap() {
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  await nextTick()
  const el = document.getElementById('mj-picker-map')
  if (!el) return
  if (pickerMap) { pickerMap.invalidateSize(); return }

  const lat = parseFloat(form.value.lat) || 41.2995
  const lng = parseFloat(form.value.lng) || 69.2401
  pickerMap = L.map(el, { zoomControl: true }).setView([lat, lng], 12)
  fonQatlam(L).addTo(pickerMap)

  if (form.value.lat && form.value.lng) {
    pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(pickerMap)
    pickerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng()
      form.value.lat = parseFloat(pos.lat.toFixed(7))
      form.value.lng = parseFloat(pos.lng.toFixed(7))
    })
  }

  pickerMap.on('click', (e) => {
    const { lat, lng } = e.latlng
    form.value.lat = parseFloat(lat.toFixed(7))
    form.value.lng = parseFloat(lng.toFixed(7))
    if (pickerMarker) {
      pickerMarker.setLatLng([lat, lng])
    } else {
      pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(pickerMap)
      pickerMarker.on('dragend', (ev) => {
        const pos = ev.target.getLatLng()
        form.value.lat = parseFloat(pos.lat.toFixed(7))
        form.value.lng = parseFloat(pos.lng.toFixed(7))
      })
    }
  })
}

function updatePickerMarker() {
  if (!pickerMap) return
  const lat = parseFloat(form.value.lat)
  const lng = parseFloat(form.value.lng)
  if (isNaN(lat) || isNaN(lng)) return
  import('leaflet').then(({ default: L }) => {
    if (pickerMarker) {
      pickerMarker.setLatLng([lat, lng])
    } else {
      pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(pickerMap)
      pickerMarker.on('dragend', (e) => {
        const pos = e.target.getLatLng()
        form.value.lat = parseFloat(pos.lat.toFixed(7))
        form.value.lng = parseFloat(pos.lng.toFixed(7))
      })
    }
    pickerMap.setView([lat, lng], pickerMap.getZoom())
  })
}

function clearPickerMarker() {
  if (pickerMarker && pickerMap) {
    pickerMarker.remove()
    pickerMarker = null
  }
}

function useMyLocation() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition((pos) => {
    form.value.lat = parseFloat(pos.coords.latitude.toFixed(7))
    form.value.lng = parseFloat(pos.coords.longitude.toFixed(7))
    if (pickerMap) {
      pickerMap.setView([form.value.lat, form.value.lng], 15)
      updatePickerMarker()
    }
  }, () => {})
}

function destroyPickerMap() {
  if (pickerMarker) { pickerMarker.remove(); pickerMarker = null }
  if (pickerMap)    { pickerMap.remove();    pickerMap    = null }
}

// visit tabiga o'tganda xaritani init qilish
watch(() => formTab.value, async (tab) => {
  if (tab === 'visit' && showModal.value) {
    await nextTick()
    await initPickerMap()
  }
})

// Modal yopilganda picker map ni tozalash
watch(showModal, (open) => {
  if (!open) destroyPickerMap()
})

/* ── Map ── */
let leafletMap = null
let markers    = []

async function initMap() {
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  await nextTick()
  const el = document.getElementById('mj-leaflet-map')
  if (!el || leafletMap) return
  leafletMap = L.map(el).setView([41.2995, 69.2401], 11)
  fonQatlam(L).addTo(leafletMap)
}

function renderMap() {
  if (!leafletMap) return
  import('leaflet').then(({ default: L }) => {
    markers.forEach(m => m.remove()); markers = []
    mapRows.value.forEach(m => {
      const c = sinfColor(m.sinf)
      const icon = L.divIcon({
        html: `<div style="width:30px;height:30px;border-radius:50%;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)">${m.nomi?.charAt(0)?.toUpperCase()}</div>`,
        className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      })
      const mk = L.marker([parseFloat(m.lat), parseFloat(m.lng)], { icon }).addTo(leafletMap)
      mk.bindPopup(`<b>${m.nomi}</b><br>${m.territoriya?.nomi || ''} · Sinf: ${m.sinf || '—'}`)
      mk.on('click', () => { mapSelected.value = m.id; detailMijoz.value = m })
      markers.push(mk)
    })
  })
}

function selectMapMijoz(m) {
  mapSelected.value = m.id; detailMijoz.value = m
  if (leafletMap && m.lat && m.lng) leafletMap.setView([parseFloat(m.lat), parseFloat(m.lng)], 14)
}

watch(view, async (v) => {
  if (v === 'map') { await nextTick(); await initMap(); await loadAll() }
})

onMounted(async () => { await loadSprav(); await load(); loadXulosa() })
onUnmounted(() => { if (leafletMap) { leafletMap.remove(); leafletMap = null } })
</script>

<style scoped>
.mj-page { display:flex; flex-direction:column; gap:14px; }

/* Header */
.mj-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; padding:20px 0 0; }
.mj-title  { font-size:21px; font-weight:800; color:#1e293b; margin:0 0 3px; }
.mj-sub    { font-size:13px; color:#94a3b8; margin:0; }
.mj-header-right { display:flex; align-items:center; gap:10px; }
.mj-view-tog { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; gap:2px; }
.mj-vt { width:34px; height:34px; border:none; background:none; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:all .13s; }
.mj-vt--on { background:#fff; color:#6366f1; box-shadow:0 1px 4px rgba(0,0,0,.1); }
.mj-add-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:11px; border:none; background:#6366f1; color:#fff; font-size:13.5px; font-weight:600; cursor:pointer; box-shadow:0 2px 10px rgba(99,102,241,.3); transition:all .14s; }
.mj-add-btn:hover { background:#4f46e5; }
.mj-imp-btn { display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:11px; border:1.5px solid #c7d2fe; background:#fff; color:#4f46e5; font-size:13.5px; font-weight:600; cursor:pointer; transition:all .14s; }
.mj-imp-btn:hover { background:#eef2ff; border-color:#a5b4fc; }
.mj-add-btn--sm { font-size:12px; padding:6px 14px; border-radius:8px; margin-top:8px; }

/* KPI */
.mj-kpis { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:12px; }
@media (max-width: 1100px) { .mj-kpis { grid-template-columns:repeat(2, minmax(0,1fr)); } }
.mj-kpi { display:flex; align-items:center; gap:12px; padding:14px 16px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; text-align:left; font:inherit; color:inherit; }
.mj-kpi--btn { cursor:pointer; transition:border-color .13s, box-shadow .13s; }
.mj-kpi--btn:hover { border-color:#c7d2fe; box-shadow:0 2px 10px rgba(79,70,229,.08); }
.mj-kpi--on { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.mj-kpi-ic { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#eef2ff; color:#4f46e5; }
.mj-kpi-ic svg { width:20px; height:20px; }
.mj-kpi-ic--qizil { background:rgba(220,38,38,.09); color:#dc2626; }
.mj-kpi-ic--sariq { background:rgba(217,119,6,.11); color:#d97706; }
.mj-kpi-mat { display:flex; flex-direction:column; gap:1px; min-width:0; }
.mj-kpi-mat b { font-size:21px; font-weight:800; color:#1e293b; line-height:1.15; font-variant-numeric:tabular-nums; }
.mj-kpi-mat b small { font-size:12px; font-weight:600; color:#94a3b8; margin-left:2px; }
.mj-kpi-mat span { font-size:12px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Reyting taqsimoti */
.mj-dist { display:flex; flex-direction:column; gap:10px; padding:12px 16px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; }
.mj-dist-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.mj-dist-t { font-size:12px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:.05em; }
.mj-dist-legend { display:flex; gap:6px; flex-wrap:wrap; }
.mj-dist-l { display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px; border-radius:999px; border:1.5px solid transparent; background:#f8fafc; color:#475569; font-size:12px; font-weight:600; cursor:pointer; transition:.12s; }
.mj-dist-l i { width:8px; height:8px; border-radius:50%; background:var(--r); }
.mj-dist-l b { color:var(--r); font-weight:800; font-variant-numeric:tabular-nums; }
.mj-dist-l:hover { border-color:var(--r); background:#fff; }
.mj-dist-l--on { background:var(--f); border-color:var(--r); color:var(--r); }
.mj-dist-l--nol { opacity:.55; }
.mj-dist-bar { display:flex; gap:3px; height:10px; }
.mj-dist-bar span { border-radius:5px; min-width:6px; transition:opacity .15s; }
.mj-dist-seg--off { opacity:.25; }

/* Filters */
.mj-filters { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.mj-search { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 12px; height:36px; flex:1 1 200px; min-width:180px; max-width:320px; transition:border-color .14s; }
.mj-search:focus-within { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.mj-search svg { color:#94a3b8; flex-shrink:0; }
.mj-search-in { flex:1; min-width:0; border:none; outline:none; font-size:13px; color:#1e293b; background:transparent; }
.mj-search-in::placeholder { color:#94a3b8; }
.mj-search-x { background:none; border:none; cursor:pointer; color:#94a3b8; display:flex; transition:color .13s; }
.mj-search-x:hover { color:#ef4444; }
.mj-fsel-wrap { position:relative; display:inline-flex; align-items:center; }
.mj-fsel-wrap svg { position:absolute; left:10px; color:#94a3b8; pointer-events:none; flex-shrink:0; z-index:1; }
.mj-fsel-wrap .mj-fsel { padding-left:28px; }
.mj-fsel-wrap.on svg { color:#4f46e5; }
.mj-fsel-wrap.on .mj-fsel { border-color:#a5b4fc; background:#eef2ff; color:#3730a3; font-weight:600; }
.mj-fsel { height:36px; padding:0 26px 0 12px; border:1.5px solid #e2e8f0; border-radius:10px; background:#fff; font-size:13px; color:#334155; outline:none; cursor:pointer; transition:border-color .13s; max-width:170px; text-overflow:ellipsis; }
.mj-fsel:focus { border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,.1); }
.mj-fsel--sm { height:30px; font-size:12px; }
.mj-clear-btn { display:flex; align-items:center; gap:5px; padding:0 12px; height:36px; border-radius:10px; border:1.5px solid #fecaca; background:#fef2f2; color:#ef4444; font-size:12.5px; font-weight:600; cursor:pointer; }

/* Table */
.mj-table-wrap { background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; }
.mj-table-scroll { overflow-x:auto; }
.mj-loading { display:flex; justify-content:center; padding:60px; }
.mj-spinner { width:28px; height:28px; border:3px solid #e2e8f0; border-top-color:#6366f1; border-radius:50%; animation:mj-spin .7s linear infinite; }
.mj-spinner--sm { width:16px; height:16px; border-width:2px; }
@keyframes mj-spin { to { transform:rotate(360deg); } }
.mj-table { width:100%; border-collapse:collapse; font-size:13.5px; min-width:860px; }
.mj-table thead tr { background:#f8fafc; border-bottom:1.5px solid #e2e8f0; }
.mj-table th { padding:10px 14px; text-align:left; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; }
.th-r { text-align:right; }
.mj-table td { padding:9px 10px; height:58px; border-bottom:1px solid #f1f5f9; vertical-align:middle; white-space:nowrap; }
.mj-table th { padding-left:10px; padding-right:10px; }
.mj-table td:first-child, .mj-table th:first-child { padding-left:16px; }
/* Tor ekranda ikkinchi darajali ustunlar yashirinadi — Balans va amallar doim ko'rinsin */
@media (max-width: 1366px) { .col-hud { display:none; } }
@media (max-width: 1280px) { .col-sinf { display:none; } .mj-name-mat { max-width:200px !important; } .mj-agent-nom { max-width:140px !important; } }
.th-c, .mj-table th.th-c { text-align:center; }
.mj-table th.th-r { text-align:right; }
.mj-th-sort { display:inline-flex; align-items:center; gap:5px; border:none; background:none; padding:0; font:inherit; color:inherit; text-transform:inherit; letter-spacing:inherit; cursor:pointer; }
.mj-th-sort:hover, .mj-th-sort.on { color:#4f46e5; }
.mj-tr:last-child td { border-bottom:none; }
.mj-tr { cursor:pointer; transition:background .1s; }
.mj-tr:hover td { background:#f8fafc; }
.td-num { color:#94a3b8; font-size:12px; width:40px; }
.td-tel { color:#64748b; }
.td-r   { text-align:right; }
.td-act { width:72px; text-align:right; }
.mj-name-cell { display:flex; align-items:center; gap:10px; }
.mj-av { width:36px; height:36px; border-radius:10px; color:#fff; font-size:14px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mj-av--sm { width:28px; height:28px; border-radius:8px; font-size:11px; }
.mj-name-mat { min-width:0; max-width:240px; }
.mj-nomi    { font-size:13.5px; font-weight:700; color:#1e293b; overflow:hidden; text-overflow:ellipsis; }
.mj-yuridik { font-size:11.5px; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
.mj-stack { display:flex; flex-direction:column; align-items:flex-start; gap:3px; min-width:0; }
.mj-stack-sub { font-size:11.5px; color:#94a3b8; }
.mj-agent-nom { font-size:13px; font-weight:600; color:#334155; max-width:170px; overflow:hidden; text-overflow:ellipsis; }
.mj-tag { font-size:12px; background:#f1f5f9; color:#334155; padding:2px 8px; border-radius:6px; white-space:nowrap; }
.mj-tag--geo { background:#eef2ff; color:#4f46e5; }
.mj-dash { color:#cbd5e1; }
.mj-agent-cell { display:flex; align-items:center; gap:7px; }
.mj-kanal { font-size:10px; font-weight:700; letter-spacing:.2px; text-transform:uppercase; padding:1px 6px; border-radius:6px; white-space:nowrap; }
.mj-kanal--avto { color:#b45309; background:rgba(217,119,6,.12); }
.mj-kanal--dist { color:#4f46e5; background:rgba(99,102,241,.1); }
.mj-agent-av { width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#6366f1); color:#fff; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mj-sinf { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:7px; font-size:12px; font-weight:800; }
.mj-sinf--sm { width:22px; height:22px; border-radius:6px; font-size:11px; }
/* Mijoz reytingi (utils/reyting.ts) — ball, daraja va 0…200 chizig'i */
.mj-ry { display:flex; flex-direction:column; gap:5px; width:104px; }
.mj-ry-top { display:flex; align-items:baseline; gap:6px; }
.mj-ry-top b { font-size:14px; font-weight:800; color:var(--r); font-variant-numeric:tabular-nums; }
.mj-ry-top span { font-size:11.5px; font-weight:600; color:var(--r); }
.mj-ry-bar { height:5px; border-radius:3px; background:#f1f5f9; overflow:hidden; }
.mj-ry-bar i { display:block; height:100%; border-radius:3px; background:var(--r); }
.mj-balans { font-size:13px; font-weight:700; }
.mj-balans.pos  { color:#10b981; }
.mj-balans.neg  { color:#ef4444; }
.mj-balans.zero { color:#94a3b8; }
.mj-balans-sub { font-size:11px; color:#94a3b8; margin-top:2px; }
.mj-mtab--dot::after { content:''; display:inline-block; width:6px; height:6px; border-radius:50%; background:#6366f1; margin-left:6px; vertical-align:middle; }
.mj-qoldiq { display:flex; flex-direction:column; gap:14px; }
.mj-qoldiq-hint { margin:0; font-size:12.5px; color:#64748b; line-height:1.5; background:#f8fafc; border-radius:10px; padding:10px 14px; }
.mj-qoldiq-yon { display:flex; gap:8px; flex-wrap:wrap; }
.mj-qoldiq-yon button { flex:1; min-width:150px; padding:10px 14px; border-radius:11px; border:1.5px solid #e2e8f0; background:#fff; font-size:13px; font-weight:600; color:#475569; cursor:pointer; transition:all .13s; }
.mj-qoldiq-yon button.on { border-color:#6366f1; background:#eef2ff; color:#4338ca; }
.mj-qoldiq-yon button.neg.on { border-color:#ef4444; background:#fef2f2; color:#b91c1c; }
.mj-qoldiq-yon button.pos.on { border-color:#10b981; background:#ecfdf5; color:#047857; }
.mj-qoldiq-nat { font-size:13px; padding:10px 14px; border-radius:10px; }
.mj-qoldiq-nat.neg { background:#fef2f2; color:#991b1b; } .mj-qoldiq-nat.pos { background:#ecfdf5; color:#065f46; }
.mj-qoldiq-joriy { font-size:12.5px; color:#475569; }
.mj-qoldiq-joriy b.pos { color:#10b981; } .mj-qoldiq-joriy b.neg { color:#ef4444; } .mj-qoldiq-joriy b.zero { color:#64748b; }
.mj-faol { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; }
.mj-faol i { width:7px; height:7px; border-radius:50%; background:currentColor; }
.mj-faol.on  { color:#16a34a; }
.mj-faol.off { color:#94a3b8; }
.mj-acts { display:flex; gap:4px; opacity:0; transition:opacity .12s; }
.mj-tr:hover .mj-acts { opacity:1; }
.mj-act { width:28px; height:28px; border-radius:7px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .12s; }
.mj-act--edit { background:rgba(99,102,241,.08); color:#6366f1; }
.mj-act--edit:hover { background:rgba(99,102,241,.18); }
.mj-act--del  { background:rgba(239,68,68,.06); color:#ef4444; }
.mj-act--del:hover  { background:rgba(239,68,68,.15); }
.mj-empty { text-align:center; padding:50px; color:#94a3b8; }
.mj-empty svg { margin-bottom:10px; }
.mj-empty p { font-size:14px; font-weight:600; color:#334155; margin:0 0 8px; }

/* Pagination */
.mj-pg { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-top:1px solid #f1f5f9; }
.pg-info { font-size:12.5px; color:#64748b; }
.pg-info strong { color:#1e293b; }
.pg-btns { display:flex; gap:4px; }
.pg-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#334155; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .13s; }
.pg-btn--on { background:#6366f1; color:#fff; border-color:#6366f1; }
.pg-btn:disabled { opacity:.4; cursor:not-allowed; }

/* Map */
.mj-map-wrap { display:grid; grid-template-columns:1fr 300px; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; height:calc(100vh - 220px); min-height:480px; }
.mj-map-container { height:100%; }
.mj-map-sidebar { display:flex; flex-direction:column; background:#fff; border-left:1px solid #e2e8f0; overflow:hidden; }
.mj-map-sb-head { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #f1f5f9; font-size:13px; font-weight:600; color:#1e293b; flex-shrink:0; }
.mj-map-list { flex:1; overflow-y:auto; }
.mj-map-item { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background .12s; }
.mj-map-item:hover { background:#f8fafc; }
.mj-map-item--on  { background:rgba(99,102,241,.06); }
.mj-map-info { flex:1; min-width:0; }

/* Detail panel */
.mj-panel-overlay { position:fixed; inset:0; z-index:450; background:rgba(15,23,42,.4); backdrop-filter:blur(2px); }
.mj-panel { position:fixed; top:0; right:0; bottom:0; z-index:460; width:460px; max-width:100vw; background:#fff; border-left:1px solid #e2e8f0; display:flex; flex-direction:column; box-shadow:-16px 0 60px rgba(0,0,0,.14); }
.mj-panel-hd { display:flex; align-items:center; gap:12px; padding:18px 20px 14px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.mj-panel-av { width:46px; height:46px; border-radius:13px; color:#fff; font-size:18px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mj-panel-info { flex:1; min-width:0; }
.mj-panel-name { font-size:16px; font-weight:800; color:#1e293b; margin:0 0 2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mj-panel-sub  { font-size:12.5px; color:#94a3b8; margin:0; }
.mj-panel-badges { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:6px; }
.mj-panel-ry { padding:3px 9px; border-radius:999px; font-size:11.5px; font-weight:700; white-space:nowrap; font-variant-numeric:tabular-nums; }
.mj-panel-actions { display:flex; gap:6px; flex-shrink:0; }
.mj-panel-close { width:32px; height:32px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:all .13s; }
.mj-panel-close:hover { background:#fef2f2; color:#ef4444; border-color:#fecaca; }
.mj-balans-strip { display:flex; align-items:center; justify-content:space-between; padding:10px 20px; font-size:13px; flex-shrink:0; }
.mj-balans-strip.pos  { background:#f0fdf4; color:#16a34a; }
.mj-balans-strip.neg  { background:#fef2f2; color:#dc2626; }
.mj-balans-strip.zero { background:#f8fafc; color:#94a3b8; }
.mj-balans-strip strong { font-size:16px; font-weight:800; }

/* Kredit limit strip */
.mj-kredit-strip { padding:10px 20px; flex-shrink:0; border-bottom:1px solid #f1f5f9; }
.mj-kredit-top { display:flex; align-items:center; justify-content:space-between; font-size:11.5px; color:#94a3b8; margin-bottom:6px; }
.mj-kredit-nums { font-weight:700; color:#64748b; }
.mj-kredit-bar { height:6px; border-radius:999px; background:#f1f5f9; overflow:hidden; }
.mj-kredit-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,#6366f1,#6366f1); transition:width .4s; }
.mj-kredit-fill.over { background:linear-gradient(90deg,#f87171,#ef4444); }
.mj-kredit-note { font-size:11px; color:#dc2626; font-weight:700; margin-top:6px; }

.mj-panel-body { flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:16px; }
.mj-panel-section { display:flex; flex-direction:column; gap:10px; }
.mj-section-title { font-size:11.5px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:.05em; }
.mj-kv-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; }
.mj-kv { display:flex; flex-direction:column; gap:2px; }
.mj-k  { font-size:11px; color:#94a3b8; }
.mj-v  { font-size:13px; font-weight:600; color:#1e293b; }
.mj-izoh { font-size:13.5px; color:#334155; margin:0; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; line-height:1.6; }

/* Modal */
.mj-modal-overlay { position:fixed; inset:0; z-index:500; background:rgba(15,23,42,.5); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:16px; }
.mj-modal { background:#fff; border-radius:20px; width:100%; max-width:680px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 28px 80px rgba(0,0,0,.2); overflow:hidden; }
.mj-modal-hd { display:flex; align-items:center; gap:14px; padding:20px 24px 16px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.mj-modal-ic { width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg,#6366f1,#6366f1); color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mj-modal-title { font-size:17px; font-weight:800; color:#1e293b; margin:0 0 2px; }
.mj-modal-sub   { font-size:12.5px; color:#94a3b8; margin:0; }
.mj-modal-close { margin-left:auto; width:34px; height:34px; border-radius:10px; border:none; background:#f1f5f9; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:all .14s; flex-shrink:0; }
.mj-modal-close:hover { background:#fee2e2; color:#ef4444; }
.mj-modal-tabs { display:flex; padding:0 24px; border-bottom:1.5px solid #e2e8f0; flex-shrink:0; }
.mj-mtab { padding:10px 16px; border:none; background:none; font-size:13px; font-weight:500; color:#64748b; cursor:pointer; border-bottom:2.5px solid transparent; margin-bottom:-1.5px; transition:all .14s; white-space:nowrap; }
.mj-mtab:hover { color:#1e293b; }
.mj-mtab--on { color:#6366f1; font-weight:700; border-bottom-color:#6366f1; }
.mj-modal-body { flex:1; overflow-y:auto; padding:20px 24px; }
.mj-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.mj-fg { display:flex; flex-direction:column; gap:5px; }
.mj-fg--full { grid-column:span 2; }
.mj-fg label { font-size:12.5px; font-weight:600; color:#334155; }
.req { color:#ef4444; }
.mj-inp { padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13.5px; color:#1e293b; background:#fff; outline:none; transition:border-color .14s; width:100%; box-sizing:border-box; }
.mj-inp:focus { border-color:#6366f1; }
.mj-ta { resize:vertical; min-height:60px; }
/* Custom select */
.mj-inp--sel { padding-left:34px; padding-right:32px; appearance:none; -webkit-appearance:none; cursor:pointer; }
.mj-sel-wrap { position:relative; display:flex; align-items:center; }
.mj-sel-ic { position:absolute; left:11px; color:#94a3b8; pointer-events:none; flex-shrink:0; z-index:1; }
.mj-sel-arr { position:absolute; right:10px; color:#94a3b8; pointer-events:none; flex-shrink:0; z-index:1; }
.mj-sel-chip { display:inline-flex; align-items:center; gap:5px; margin-top:5px; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:600; }
.mj-sel-chip--geo  { background:#eef2ff; color:#4f46e5; }
.mj-sel-chip--kat  { background:#eef2ff; color:#4f46e5; }
.mj-sel-chip--agent { background:#f0fdf4; color:#16a34a; }

.mj-sinf-group { display:flex; gap:8px; flex-wrap:wrap; }
.mj-sinf-radio { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:9px; border:1.5px solid #e2e8f0; cursor:pointer; font-size:14px; font-weight:800; color:#94a3b8; transition:all .13s; }
.mj-sinf-radio--on { border-width:2px; }
.mj-toggle { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; width:fit-content; }
.mj-tog-btn { padding:6px 18px; border:none; background:none; border-radius:8px; font-size:13px; font-weight:500; color:#64748b; cursor:pointer; transition:all .13s; }
.mj-tog-btn.on  { background:#fff; color:#10b981; font-weight:700; box-shadow:0 1px 4px rgba(0,0,0,.1); }
.mj-tog-btn.off { background:#fff; color:#ef4444; font-weight:700; box-shadow:0 1px 4px rgba(0,0,0,.1); }
.mj-days { display:flex; gap:6px; flex-wrap:wrap; }
.mj-day-btn { padding:6px 12px; border:1.5px solid #e2e8f0; border-radius:8px; background:#fff; font-size:12.5px; font-weight:500; color:#64748b; cursor:pointer; transition:all .13s; }
.mj-day-btn--on { border-color:#6366f1; background:rgba(99,102,241,.08); color:#6366f1; font-weight:700; }
.mj-error { color:#ef4444; font-size:13px; padding:0 24px; margin:0; flex-shrink:0; }
.mj-modal-foot { display:flex; justify-content:flex-end; gap:10px; padding:16px 24px; border-top:1px solid #f1f5f9; flex-shrink:0; background:#f8fafc; }
.mj-btn-cancel { padding:9px 20px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; font-size:13.5px; font-weight:600; color:#334155; cursor:pointer; transition:all .13s; }
.mj-btn-cancel:hover { background:#f1f5f9; }
.mj-btn-save { display:flex; align-items:center; gap:7px; padding:9px 24px; border-radius:10px; border:none; background:#6366f1; color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 10px rgba(99,102,241,.3); transition:all .13s; min-width:100px; justify-content:center; }
.mj-btn-save:hover:not(:disabled) { background:#4f46e5; }
.mj-btn-save:disabled { opacity:.6; cursor:not-allowed; }

/* Transitions */
.mj-slide-enter-active,.mj-slide-leave-active { transition:transform .25s cubic-bezier(.4,0,.2,1); }
.mj-slide-enter-from,.mj-slide-leave-to { transform:translateX(100%); }
.mj-fade-enter-active,.mj-fade-leave-active { transition:opacity .2s,transform .2s; }
.mj-fade-enter-from,.mj-fade-leave-to { opacity:0; transform:scale(.97); }

@media (max-width:768px) {
  .mj-map-wrap { grid-template-columns:1fr; }
  .mj-map-sidebar { max-height:200px; border-left:none; border-top:1px solid #e2e8f0; }
  .mj-form-grid { grid-template-columns:1fr; }
  .mj-fg--full { grid-column:span 1; }
}

/* ── Visit tab ── */
.mj-visit-tab { display:flex; flex-direction:column; gap:20px; }
.mj-visit-section { display:flex; flex-direction:column; gap:10px; }
.mj-visit-section-title {
  display:flex; align-items:center; gap:7px;
  font-size:12px; font-weight:700; color:#334155;
  text-transform:uppercase; letter-spacing:.05em;
  padding-bottom:8px; border-bottom:1px solid #f1f5f9;
}
.mj-visit-section-title svg { color:#6366f1; flex-shrink:0; }
.mj-visit-row { display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; }

/* Koordinatalar input qatori */
.mj-loc-coords {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
}
.mj-loc-coord-item { display:flex; flex-direction:column; gap:4px; }
.mj-loc-coord-lbl  { font-size:11px; font-weight:600; color:#94a3b8; }
.mj-inp--coord { width:140px; font-size:13px; font-family:monospace; }
.mj-loc-coord-sep  { font-size:18px; color:#cbd5e1; margin-top:18px; }

.mj-loc-my-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:8px 14px; border-radius:9px; border:1.5px solid #e2e8f0;
  background:#fff; color:#334155; font-size:12.5px; font-weight:600;
  cursor:pointer; transition:all .13s; margin-top:16px; white-space:nowrap;
}
.mj-loc-my-btn:hover { border-color:#6366f1; color:#6366f1; background:rgba(99,102,241,.04); }
.mj-loc-clear-btn {
  width:32px; height:32px; border-radius:8px; border:1.5px solid #fecaca;
  background:#fef2f2; color:#ef4444; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .13s; margin-top:16px; flex-shrink:0;
}
.mj-loc-clear-btn:hover { background:#fee2e2; }

/* Picker xarita */
.mj-picker-map-wrap {
  position:relative; border-radius:14px;
  overflow:hidden; border:1.5px solid #e2e8f0;
  height:280px;
  box-shadow:0 2px 12px rgba(0,0,0,.08);
}
.mj-picker-map { width:100%; height:100%; }

.mj-picker-hint {
  position:absolute; bottom:12px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:7px;
  background:rgba(255,255,255,.95); border:1px solid #e2e8f0;
  border-radius:20px; padding:7px 14px;
  font-size:12.5px; color:#64748b; font-weight:500;
  pointer-events:none; white-space:nowrap;
  box-shadow:0 2px 12px rgba(0,0,0,.1); z-index:1000;
}
.mj-picker-hint svg { color:#6366f1; flex-shrink:0; }

.mj-picker-coords-badge {
  position:absolute; bottom:12px; left:50%; transform:translateX(-50%);
  background:rgba(99,102,241,.92); color:#fff;
  border-radius:20px; padding:6px 14px;
  font-size:12px; font-weight:700; font-family:monospace;
  pointer-events:none; white-space:nowrap;
  box-shadow:0 2px 12px rgba(99,102,241,.3); z-index:1000;
}
</style>
