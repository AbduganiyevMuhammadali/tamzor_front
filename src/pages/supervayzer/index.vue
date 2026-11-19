<template>
  <div class="sv-wrap">

    <!-- ══ HEADER ══ -->
    <div class="sv-header">
      <div class="sv-header-left">
        <div class="sv-header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <h1 class="sv-title">Agentlar boshqaruvi</h1>
          <p class="sv-subtitle">Savdo agentlari, marshrut va plan nazorati</p>
        </div>
      </div>
      <div class="sv-header-right">
        <div class="sv-period-group">
          <button v-for="p in PERIODS" :key="p.key" :class="['sv-period-btn', period===p.key&&'sv-period-btn--on']" @click="period=p.key">{{ p.label }}</button>
        </div>
        <button class="sv-add-btn" @click="openAdd">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Agent qo'shish
        </button>
        <button class="sv-refresh" @click="load" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" :class="loading&&'sv-spin'"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
        </button>
      </div>
    </div>

    <!-- ══ KPI ══ -->
    <div class="sv-kpi-row">
      <div class="sv-kpi-card" v-for="k in kpiCards" :key="k.key">
        <div class="sv-kpi-icon" :style="{background:k.bg,color:k.color}" v-html="k.icon"/>
        <div>
          <div class="sv-kpi-val">{{ k.value }}</div>
          <div class="sv-kpi-lbl">{{ k.label }}</div>
        </div>
        <div v-if="k.trend!==undefined" class="sv-kpi-trend" :style="{color:k.trend>=0?'#10b981':'#ef4444'}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline v-if="k.trend>=0" points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline v-else points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
          {{ Math.abs(k.trend) }}%
        </div>
      </div>
    </div>

    <!-- ══ TOOLBAR ══ -->
    <div class="sv-toolbar">
      <div class="sv-search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQ" class="sv-search-in" placeholder="Agent qidirish..."/>
      </div>
      <select class="sv-fsel" v-model="filterHudud">
        <option value="">Barcha hududlar</option>
        <option v-for="t in sprav.territoriyalar" :key="t.id" :value="t.id">{{ t.nomi }}</option>
      </select>
      <div class="sv-sort-group">
        <button v-for="s in SORTS" :key="s.key" :class="['sv-sort-btn',sortBy===s.key&&'sv-sort-btn--on']" @click="sortBy=s.key">{{ s.label }}</button>
      </div>
      <div class="sv-view-btns">
        <button :class="['sv-vbtn',viewMode==='grid'&&'sv-vbtn--on']" @click="viewMode='grid'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </button>
        <button :class="['sv-vbtn',viewMode==='list'&&'sv-vbtn--on']" @click="viewMode='list'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
      </div>
      <span class="sv-cnt-badge">{{ filteredAgents.length }} ta agent</span>
    </div>

    <!-- ══ SKELETON ══ -->
    <template v-if="loading">
      <div :class="viewMode==='grid'?'sv-agents-grid':'sv-list-wrap'">
        <div class="sv-skel" v-for="i in 6" :key="i" :style="viewMode==='list'?{height:'60px',borderRadius:'10px'}:{}"/>
      </div>
    </template>

    <!-- ══ GRID VIEW ══ -->
    <div v-else-if="viewMode==='grid'" class="sv-agents-grid">
      <div v-if="filteredAgents.length===0" class="sv-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>Agent topilmadi</p>
        <button class="sv-add-btn sv-add-btn--sm" @click="openAdd">+ Agent qo'shish</button>
      </div>
      <div v-for="agent in filteredAgents" :key="agent.id"
        :class="['sv-agent-card', selectedAgent?.id===agent.id&&'sv-agent-card--on']"
        @click="selectAgent(agent)">

        <div class="sv-card-head">
          <div class="sv-card-av" :style="{background:agentColor(agent.id)}">
            {{ initials(agent.fullname) }}
            <span class="sv-dot" :class="agent.online?'sv-dot--on':'sv-dot--off'"/>
          </div>
          <div class="sv-card-info">
            <div class="sv-card-name">{{ agent.fullname }}</div>
            <div class="sv-card-meta">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ agent.hudud || '—' }}
            </div>
          </div>
          <span class="sv-plan-badge" :style="planBadge(agent.plan_pct)">{{ agent.plan_pct }}%</span>
        </div>

        <div class="sv-card-stats">
          <div class="sv-stat">
            <div class="sv-stat-val">{{ agent.mijozlar_soni }}</div>
            <div class="sv-stat-lbl">Mijoz</div>
          </div>
          <div class="sv-stat-div"/>
          <div class="sv-stat">
            <div class="sv-stat-val">{{ agent.bugungi_tashrif }}</div>
            <div class="sv-stat-lbl">Tashrif</div>
          </div>
          <div class="sv-stat-div"/>
          <div class="sv-stat">
            <div class="sv-stat-val">{{ agent.buyurtmalar_soni }}</div>
            <div class="sv-stat-lbl">Buyurtma</div>
          </div>
          <div class="sv-stat-div"/>
          <div class="sv-stat">
            <div class="sv-stat-val">{{ fmtS(agent.fakt_summa) }}</div>
            <div class="sv-stat-lbl">Savdo</div>
          </div>
        </div>

        <div class="sv-card-plan">
          <div class="sv-plan-row">
            <span class="sv-plan-lbl">Plan: {{ fmtS(agent.fakt_summa) }} / {{ fmtS(agent.plan_summa) }} so'm</span>
          </div>
          <div class="sv-plan-track">
            <div class="sv-plan-fill" :style="{width:Math.min(agent.plan_pct,100)+'%',background:planColor(agent.plan_pct)}"/>
          </div>
        </div>

        <div class="sv-card-days" v-if="agent.tashrif_kunlari?.length">
          <span v-for="d in agent.tashrif_kunlari" :key="d" class="sv-day-chip"
            :style="{background:agentColor(agent.id)+'15',color:agentColor(agent.id)}">{{ d }}</span>
        </div>

        <div class="sv-card-foot">
          <div class="sv-card-foot-actions" @click.stop>
            <button class="sv-ic-btn sv-ic-btn--edit" @click.stop="openEdit(agent)" title="Tahrirlash">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="sv-ic-btn sv-ic-btn--del" @click.stop="deleteAgent(agent)" title="O'chirish">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
          <span class="sv-card-see">{{ selectedAgent?.id===agent.id?'Yopish':'Batafsil' }}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline v-if="selectedAgent?.id===agent.id" points="18 15 12 9 6 15"/><polyline v-else points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
      </div>
    </div>

    <!-- ══ LIST VIEW ══ -->
    <div v-else class="sv-list-wrap">
      <table class="sv-list-tbl">
        <thead>
          <tr>
            <th>#</th><th>Agent</th><th>Hudud</th><th>Mijozlar</th><th>Tashrif</th><th>Buyurtma</th>
            <th>Plan</th><th>Savdo</th><th>Holat</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredAgents.length===0"><td colspan="10" class="sv-list-empty">Agent topilmadi</td></tr>
          <tr v-for="(a,i) in filteredAgents" :key="a.id"
            :class="['sv-list-row',selectedAgent?.id===a.id&&'sv-list-row--on']"
            @click="selectAgent(a)">
            <td class="sv-list-idx">{{ i+1 }}</td>
            <td>
              <div class="sv-list-agent">
                <div class="sv-list-av" :style="{background:agentColor(a.id)}">
                  {{ initials(a.fullname) }}<span class="sv-dot sv-dot--sm" :class="a.online?'sv-dot--on':'sv-dot--off'"/>
                </div>
                <div>
                  <div class="sv-list-name">{{ a.fullname }}</div>
                  <div class="sv-list-sub">{{ a.hudud||'—' }}</div>
                </div>
              </div>
            </td>
            <td><span class="sv-geo-chip">{{ a.hudud||'—' }}</span></td>
            <td class="sv-num">{{ a.mijozlar_soni }}</td>
            <td class="sv-num">{{ a.bugungi_tashrif }}</td>
            <td class="sv-num">{{ a.buyurtmalar_soni }}</td>
            <td>
              <div class="sv-list-plan">
                <div class="sv-list-plan-bar"><div :style="{width:Math.min(a.plan_pct,100)+'%',background:planColor(a.plan_pct)}"/></div>
                <span :style="{color:planColor(a.plan_pct),fontWeight:800,fontSize:'12px'}">{{ a.plan_pct }}%</span>
              </div>
            </td>
            <td class="sv-num">{{ fmtS(a.fakt_summa) }}</td>
            <td><span class="sv-status-chip" :class="a.online?'on':'off'">{{ a.online?'Online':'Offline' }}</span></td>
            <td>
              <div class="sv-list-acts" @click.stop>
                <button class="sv-ic-btn sv-ic-btn--edit" @click.stop="openEdit(a)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="sv-ic-btn sv-ic-btn--del" @click.stop="deleteAgent(a)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ DETAIL PANEL ══ -->
    <transition name="sv-slide">
      <div class="sv-detail" v-if="selectedAgent" ref="detailRef">

        <div class="sv-detail-hd">
          <div class="sv-detail-av" :style="{background:agentColor(selectedAgent.id)}">
            {{ initials(selectedAgent.fullname) }}
            <span class="sv-dot sv-dot--lg" :class="selectedAgent.online?'sv-dot--on':'sv-dot--off'"/>
          </div>
          <div class="sv-detail-info">
            <h2 class="sv-detail-name">{{ selectedAgent.fullname }}</h2>
            <div class="sv-detail-chips">
              <span class="sv-chip">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ selectedAgent.hudud||'Hudud belgilanmagan' }}
              </span>
              <span class="sv-chip">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.64 13a19.79 19.79 0 01-3.07-8.67A2 2 0 013.55 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 9.91a16 16 0 006.17 6.17l1.06-1.06a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                {{ selectedAgent.telefon||'—' }}
              </span>
              <span class="sv-chip sv-chip--plan" :style="planBadge(selectedAgent.plan_pct)">Plan: {{ selectedAgent.plan_pct }}%</span>
            </div>
          </div>
          <div class="sv-detail-hd-right">
            <button class="sv-edit-btn" @click="openEdit(selectedAgent)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Tahrirlash
            </button>
            <button class="sv-close-btn" @click="selectedAgent=null">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- detail tabs -->
        <div class="sv-dtabs">
          <button v-for="t in DETAIL_TABS" :key="t.key" :class="['sv-dtab',detailTab===t.key&&'sv-dtab--on']" @click="onDetailTabChange(t.key)">
            <span v-html="t.icon"/>&nbsp;{{ t.label }}
            <span v-if="t.cnt!==undefined" class="sv-dtab-cnt">{{ t.cnt }}</span>
          </button>
        </div>

        <!-- TAB: UMUMIY -->
        <div v-if="detailTab==='umumiy'" class="sv-tab-body">
          <!-- KPI cards -->
          <div class="sv-kpi-detail-row">
            <div class="sv-kpid" v-for="k in agentKpi" :key="k.key">
              <div class="sv-kpid-ic" :style="{background:k.bg,color:k.color}" v-html="k.icon"/>
              <div class="sv-kpid-val">{{ k.value }}</div>
              <div class="sv-kpid-lbl">{{ k.label }}</div>
            </div>
          </div>

          <!-- Plan progress -->
          <div class="sv-plan-card">
            <div class="sv-plan-card-hd">
              <span class="sv-plan-card-title">Oylik savdo plani</span>
              <span class="sv-plan-badge" :style="planBadge(selectedAgent.plan_pct)">{{ selectedAgent.plan_pct }}%</span>
            </div>
            <div class="sv-plan-detail-track">
              <div class="sv-plan-detail-fill" :style="{width:Math.min(selectedAgent.plan_pct,100)+'%',background:planColor(selectedAgent.plan_pct)}"/>
            </div>
            <div class="sv-plan-card-nums">
              <div><div class="sv-plan-num-val">{{ fmtS(selectedAgent.fakt_summa) }} so'm</div><div class="sv-plan-num-lbl">Bajarildi</div></div>
              <div style="text-align:right"><div class="sv-plan-num-val">{{ fmtS(selectedAgent.plan_summa) }} so'm</div><div class="sv-plan-num-lbl">Plan</div></div>
            </div>
            <!-- Qolgan plan + bonus -->
            <div class="sv-plan-extra">
              <div class="sv-pe-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div>
                  <div class="sv-pe-val">{{ fmtS(selectedAgent.qolgan_plan) }} so'm</div>
                  <div class="sv-pe-lbl">Qolgan plan</div>
                </div>
              </div>
              <div class="sv-pe-div"/>
              <div class="sv-pe-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <div>
                  <div class="sv-pe-val" style="color:#10b981">+{{ fmtS(selectedAgent.bonus_summa) }} so'm</div>
                  <div class="sv-pe-lbl">Bonus ({{ selectedAgent.bonus_foiz }}%)</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Haftalik activity -->
          <div class="sv-act-card">
            <div class="sv-act-title">Haftalik tashrif taqsimoti</div>
            <div class="sv-act-bars">
              <div v-for="d in WEEKDAYS" :key="d.key" class="sv-act-col">
                <div class="sv-act-bar-wrap">
                  <div class="sv-act-bar" :style="{height:actPct(d.key)+'%',background:actPct(d.key)>0?agentColor(selectedAgent.id):'#e2e8f0'}"/>
                </div>
                <div class="sv-act-day">{{ d.s }}</div>
                <div class="sv-act-cnt">{{ getMijozlarByDay(d.key).length }}</div>
              </div>
            </div>
          </div>

          <!-- Sinf taqsimoti -->
          <div class="sv-sinf-card" v-if="selectedAgent.sinflar?.length">
            <div class="sv-act-title">Mijozlar sinf bo'yicha</div>
            <div class="sv-sinf-rows">
              <div class="sv-sinf-row" v-for="s in selectedAgent.sinflar" :key="s.sinf">
                <span class="sv-sinf-badge" :style="{background:sinfColor(s.sinf)+'18',color:sinfColor(s.sinf),borderColor:sinfColor(s.sinf)+'35'}">{{ s.sinf }}</span>
                <div class="sv-sinf-track"><div class="sv-sinf-fill" :style="{width:(s.count/selectedAgent.mijozlar_soni*100)+'%',background:sinfColor(s.sinf)}"/></div>
                <span class="sv-sinf-cnt">{{ s.count }} ta</span>
                <span class="sv-sinf-pct">{{ Math.round(s.count/selectedAgent.mijozlar_soni*100) }}%</span>
              </div>
            </div>
          </div>

          <!-- Reyting -->
          <div class="sv-rank-card">
            <div class="sv-act-title">Agentlar reytingi (plan bo'yicha)</div>
            <div class="sv-rank-list">
              <div v-for="(a,i) in rankedAgents" :key="a.id" :class="['sv-rank-row',a.id===selectedAgent.id&&'sv-rank-row--on']">
                <div class="sv-rank-pos" :style="i<3?{background:['#fef3c7','#f1f5f9','#fdf4e7'][i],color:['#d97706','#64748b','#92400e'][i]}:{}">{{ i+1 }}</div>
                <div class="sv-list-av sv-list-av--xs" :style="{background:agentColor(a.id)}">{{ initials(a.fullname) }}</div>
                <div class="sv-rank-name">{{ a.fullname }}</div>
                <div class="sv-rank-bar"><div class="sv-rank-bar-fill" :style="{width:Math.min(a.plan_pct,100)+'%',background:planColor(a.plan_pct)}"/></div>
                <span class="sv-rank-pct" :style="{color:planColor(a.plan_pct)}">{{ a.plan_pct }}%</span>
                <span class="sv-rank-sum">{{ fmtS(a.fakt_summa) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: MIJOZLAR -->
        <div v-if="detailTab==='mijozlar'" class="sv-tab-body">
          <div class="sv-tab-toolbar">
            <div class="sv-tab-srch">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input v-model="mijozSearch" class="sv-tab-srch-in" placeholder="Mijoz qidirish..."/>
            </div>
            <select class="sv-fsel" v-model="mijozSinf">
              <option value="">Barcha sinflar</option>
              <option v-for="s in ['A','B','C','D']" :key="s" :value="s">{{ s }}-sinf</option>
            </select>
            <select class="sv-fsel" v-model="mijozStatus">
              <option value="">Barcha holat</option>
              <option value="faol">Faol</option>
              <option value="nofaol">Nofaol</option>
            </select>
            <span class="sv-tab-cnt">{{ filteredMijozlar.length }} ta</span>
          </div>
          <div class="sv-table-wrap">
            <table class="sv-table">
              <thead><tr><th>#</th><th>Mijoz</th><th>Hudud</th><th>Sinf</th><th>Tashrif kunlari</th><th style="text-align:right">Balans</th><th>Holat</th></tr></thead>
              <tbody>
                <tr v-if="filteredMijozlar.length===0"><td colspan="7" class="sv-tbl-empty"><p>Mijoz topilmadi</p></td></tr>
                <tr v-for="(m,i) in filteredMijozlar" :key="m.id" class="sv-tbl-row">
                  <td class="sv-td-i">{{ i+1 }}</td>
                  <td><div class="sv-mj-cell"><div class="sv-mj-av" :style="{background:sinfColor(m.sinf)+'20',color:sinfColor(m.sinf)}">{{ m.nomi?.charAt(0) }}</div><div><div class="sv-mj-name">{{ m.nomi }}</div><div class="sv-mj-addr">{{ m.manzil||'—' }}</div></div></div></td>
                  <td><span v-if="m.territoriya" class="sv-geo-chip">{{ m.territoriya.nomi }}</span><span v-else class="sv-dash">—</span></td>
                  <td><span v-if="m.sinf" class="sv-sinf-badge" :style="{background:sinfColor(m.sinf)+'18',color:sinfColor(m.sinf),borderColor:sinfColor(m.sinf)+'35'}">{{ m.sinf }}</span><span v-else class="sv-dash">—</span></td>
                  <td><div v-if="m.tashrif_kunlari" class="sv-days-row"><span v-for="d in m.tashrif_kunlari.split(',').map(s=>s.trim()).filter(Boolean)" :key="d" class="sv-day-chip" style="background:rgba(139,92,246,.08);color:#8b5cf6">{{ d }}</span></div><span v-else class="sv-dash">—</span></td>
                  <td style="text-align:right"><span class="sv-bal" :class="parseFloat(m.balans)>0?'pos':parseFloat(m.balans)<0?'neg':'zero'">{{ fmtN(m.balans) }}</span></td>
                  <td><span class="sv-status-chip" :class="m.faol?'on':'off'">{{ m.faol?'Faol':'Nofaol' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: MARSHRUT -->
        <div v-if="detailTab==='marshrut'" class="sv-tab-body sv-tab-body--map">

          <!-- Top panel -->
          <div class="mp-top">

            <!-- Stats strip -->
            <div class="mp-stats">
              <div class="mp-stat">
                <div class="mp-stat-ic" style="background:rgba(139,92,246,.1);color:#8b5cf6">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <div class="mp-stat-val">{{ routePoints.length }}</div>
                  <div class="mp-stat-lbl">Nuqta</div>
                </div>
              </div>
              <div class="mp-stat-div"/>
              <div class="mp-stat">
                <div class="mp-stat-ic" style="background:rgba(16,185,129,.1);color:#10b981">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <div>
                  <div class="mp-stat-val">{{ routeTotalKm }} km</div>
                  <div class="mp-stat-lbl">Masofa</div>
                </div>
              </div>
              <div class="mp-stat-div"/>
              <div class="mp-stat">
                <div class="mp-stat-ic" style="background:rgba(245,158,11,.1);color:#f59e0b">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <div class="mp-stat-val">{{ routeEstTime }}</div>
                  <div class="mp-stat-lbl">Taxminiy vaqt</div>
                </div>
              </div>
              <div class="mp-stat-div"/>
              <div class="mp-stat">
                <div class="mp-stat-ic" :style="{background:agentColor(selectedAgent.id)+'18',color:agentColor(selectedAgent.id)}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div>
                  <div class="mp-stat-val">{{ selectedAgent.transport ? TRANSPORT_LABELS[selectedAgent.transport] : '—' }}</div>
                  <div class="mp-stat-lbl">Transport</div>
                </div>
              </div>
            </div>

            <!-- Controls -->
            <div class="mp-controls">
              <!-- Legend -->
              <div class="mp-legend">
                <span v-for="s in ['A','B','C','D']" :key="s" class="mp-leg-item">
                  <span class="mp-leg-dot" :style="{background:sinfColor(s)}"/>
                  <span>{{ s }}</span>
                </span>
                <span class="mp-leg-item">
                  <span class="mp-leg-line" :style="{background:agentColor(selectedAgent.id)}"/>
                  <span>Optimal marshrut</span>
                </span>
                <span class="mp-leg-item">
                  <span class="mp-leg-start"/>
                  <span>Boshlash nuqtasi</span>
                </span>
              </div>

              <div class="mp-btns">
                <!-- Geolocation -->
                <button class="mp-btn" @click="getMyLocation" :disabled="geoLoading" title="Hozirgi joylashuv">
                  <svg v-if="!geoLoading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
                  <span v-else class="mp-spin"/>
                  {{ geoLoading ? 'Aniqlanmoqda...' : 'Joylashuvim' }}
                </button>
                <!-- Optimize -->
                <button class="mp-btn mp-btn--primary" @click="optimizeRoute" :disabled="routePoints.length < 2" title="Optimal marshrut hisoblash">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Optimal marshrut
                </button>
                <!-- Fit -->
                <button class="mp-btn" @click="fitMapBounds" title="Hammasini ko'rish">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
                  Ko'rinish
                </button>
              </div>
            </div>
          </div>

          <!-- No location warning -->
          <div v-if="routePoints.length === 0" class="mp-no-loc">
            <div class="mp-no-loc-ic">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/><line x1="2" y1="2" x2="22" y2="22" stroke-width="2"/></svg>
            </div>
            <div class="mp-no-loc-title">Lokatsiya ma'lumoti yo'q</div>
            <div class="mp-no-loc-sub">Bu agentning mijozlarida GPS koordinatalari kiritilmagan</div>
          </div>

          <!-- Map + sidebar layout -->
          <div class="mp-body" v-show="true">
            <!-- Sidebar: stop list -->
            <div class="mp-sidebar">
              <div class="mp-sidebar-head">
                <span class="mp-sidebar-title">Bekatlar tartibi</span>
                <span class="mp-sidebar-cnt">{{ optimizedRoute.length }} ta</span>
              </div>
              <div class="mp-stops">
                <!-- Start -->
                <div class="mp-stop mp-stop--start" v-if="userLocation">
                  <div class="mp-stop-num mp-stop-num--start">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                  </div>
                  <div class="mp-stop-line mp-stop-line--start"/>
                  <div class="mp-stop-info">
                    <div class="mp-stop-name">Siz turgan joy</div>
                    <div class="mp-stop-addr">Boshlash nuqtasi</div>
                  </div>
                </div>

                <!-- Waypoints -->
                <div v-for="(m, i) in optimizedRoute" :key="m.id"
                  class="mp-stop"
                  :class="activeStop===m.id && 'mp-stop--active'"
                  @click="focusStop(m)">
                  <div class="mp-stop-num" :style="{background:sinfColor(m.sinf)+'20',color:sinfColor(m.sinf),borderColor:sinfColor(m.sinf)+'40'}">
                    {{ i + 1 }}
                  </div>
                  <div class="mp-stop-line" v-if="i < optimizedRoute.length - 1" :style="{background:agentColor(selectedAgent.id)+'40'}"/>
                  <div class="mp-stop-info">
                    <div class="mp-stop-name">{{ m.nomi }}</div>
                    <div class="mp-stop-meta">
                      <span class="mp-sinf-tag" :style="{background:sinfColor(m.sinf)+'18',color:sinfColor(m.sinf)}">{{ m.sinf||'?' }}-sinf</span>
                      <span v-if="m.manzil" class="mp-stop-addr">{{ m.manzil }}</span>
                    </div>
                    <div class="mp-stop-dist" v-if="segmentDists[i]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      {{ getSegmentDist(i) }} km
                      <span v-if="segmentTimes[i]" class="mp-stop-time">· ~{{ Math.round(segmentTimes[i]) }} min</span>
                    </div>
                  </div>
                  <button class="mp-stop-focus" @click.stop="focusStop(m)">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </button>
                </div>

                <div v-if="optimizedRoute.length === 0" class="mp-stops-empty">
                  Lokatsiyali mijozlar yo'q
                </div>
              </div>
            </div>

            <!-- Map -->
            <div class="mp-map-wrap">
              <div :id="'sv-map-'+selectedAgent.id" class="mp-map"/>

              <!-- Route loading overlay -->
              <transition name="mp-fade">
                <div v-if="routeLoading" class="mp-loading-overlay">
                  <div class="mp-loading-card">
                    <div class="mp-loading-spinner"/>
                    <div class="mp-loading-text">
                      <div class="mp-loading-title">Real yo'l hisoblanmoqda</div>
                      <div class="mp-loading-sub">OSRM orqali yo'l ma'lumotlari yuklanmoqda...</div>
                    </div>
                  </div>
                </div>
              </transition>

              <!-- Map hint -->
              <div class="mp-map-hint" v-if="routePoints.length > 0 && !routeLoading">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Marker ustiga bosing — batafsil
              </div>
            </div>
          </div>

        </div>

        <!-- TAB: TASHRIF -->
        <!-- TAB: REJA -->
        <div v-if="detailTab==='reja'" class="sv-tab-body sv-reja-tab">
          <!-- Yuklanmoqda -->
          <div v-if="arizalarLoading" class="sv-reja-loading">
            <svg class="sv-reja-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/></svg>
            Yuklanmoqda...
          </div>
          <!-- Bo'sh -->
          <div v-else-if="!agentArizalar.length" class="sv-reja-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p>Tasdiqlangan ariza yo'q</p>
            <span>Agent uchun tasdiqlangan arizalar bu yerda ko'rinadi</span>
          </div>
          <!-- Sana bo'yicha reja -->
          <div v-else class="sv-reja-list">
            <div v-for="group in rejaByDate" :key="group.date" class="sv-reja-group">
              <!-- Sana header -->
              <div class="sv-reja-date-hd">
                <div class="sv-reja-date-ic">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <span class="sv-reja-date-lbl">
                  {{ group.date === 'Sana_belgilanmagan' ? 'Sana belgilanmagan' : fmtRejaDate(group.date) }}
                </span>
                <span class="sv-reja-date-cnt">{{ group.items.length }} ta ariza</span>
                <span class="sv-reja-date-sum">{{ fmtS(group.items.reduce((s, a) => s + (a.jami_summa || 0), 0)) }} so'm</span>
              </div>
              <!-- Arizalar -->
              <div class="sv-reja-items">
                <div v-for="ariza in group.items" :key="ariza.id" class="sv-reja-item">
                  <div class="sv-reja-item-av" :style="{ background: rejaAvatarColor(ariza.id) }">
                    {{ (ariza.mijoz_nomi || '?')[0].toUpperCase() }}
                  </div>
                  <div class="sv-reja-item-info">
                    <div class="sv-reja-mijoz">{{ ariza.mijoz_nomi || '—' }}</div>
                    <div class="sv-reja-meta">
                      <span class="sv-reja-raqam">#{{ ariza.raqam }}</span>
                      <span v-if="ariza.ekspeditor">· {{ ariza.ekspeditor }}</span>
                    </div>
                  </div>
                  <!-- Tovarlar mini -->
                  <div class="sv-reja-tovs">
                    <div class="sv-reja-tov" v-for="q in (ariza.qatorlar || []).slice(0, 3)" :key="q.id">
                      <span class="sv-reja-tname">{{ q.tovar_nomi }}</span>
                      <span class="sv-reja-tqty">
                        <template v-if="q.blok">{{ q.blok }}bl</template>
                        <template v-if="q.blok && q.dona"> + </template>
                        <template v-if="q.dona">{{ q.dona }}d</template>
                      </span>
                    </div>
                    <span v-if="(ariza.qatorlar||[]).length > 3" class="sv-reja-more">
                      +{{ ariza.qatorlar.length - 3 }} tovar
                    </span>
                  </div>
                  <div class="sv-reja-item-right">
                    <span class="sv-reja-sum">{{ fmtS(ariza.jami_summa) }}</span>
                    <span class="sv-reja-holat">Tasdiqlangan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="detailTab==='tashrif'" class="sv-tab-body">
          <div class="sv-tashrif-grid">
            <div v-for="d in WEEKDAYS" :key="d.key" class="sv-tashrif-col">
              <div class="sv-tashrif-hd">
                <span class="sv-tashrif-day">{{ d.label }}</span>
                <span class="sv-tashrif-cnt2" :style="getMijozlarByDay(d.key).length>0?{background:agentColor(selectedAgent.id)+'20',color:agentColor(selectedAgent.id)}:{}">
                  {{ getMijozlarByDay(d.key).length }}
                </span>
              </div>
              <div class="sv-tashrif-list">
                <div v-for="m in getMijozlarByDay(d.key)" :key="m.id" class="sv-tashrif-item">
                  <div class="sv-tashrif-av" :style="{background:sinfColor(m.sinf)+'20',color:sinfColor(m.sinf)}">{{ m.nomi?.charAt(0) }}</div>
                  <div class="sv-tashrif-name">{{ m.nomi }}</div>
                </div>
                <div v-if="!getMijozlarByDay(d.key).length" class="sv-tashrif-none">—</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </transition>

    <!-- ══ MODAL: Agent qo'shish / tahrirlash ══ -->
    <teleport to="body">
      <transition name="mfade">
        <div v-if="modal" class="sv-overlay" @click.self="modal=null">
          <div class="sv-modal">
            <div class="sv-modal-hd">
              <div class="sv-modal-title">
                <span class="sv-modal-icon" :style="modal.id?{background:'rgba(139,92,246,.12)',color:'#8b5cf6'}:{background:'rgba(16,185,129,.12)',color:'#10b981'}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                {{ modal.id ? 'Agentni tahrirlash' : "Agent qo'shish" }}
              </div>
              <button class="sv-modal-x" @click="modal=null">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Step nav -->
            <div class="fm-steps">
              <button v-for="(s,i) in FORM_STEPS" :key="s.key"
                type="button"
                :class="['fm-step', formStep===i&&'fm-step--on', formStep>i&&'fm-step--done']"
                @click="formStep=i">
                <span class="fm-step-num">
                  <svg v-if="formStep>i" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span v-else>{{ i+1 }}</span>
                </span>
                <span class="fm-step-lbl">{{ s.label }}</span>
              </button>
              <div class="fm-step-line"/>
            </div>

            <transition name="ferr">
              <div v-if="formErr" class="sv-form-err">
                <div class="sv-form-err-ic">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div class="sv-form-err-body">
                  <div class="sv-form-err-title">Xatolik</div>
                  <div class="sv-form-err-msg">{{ formErr }}</div>
                </div>
                <button class="sv-form-err-x" @click="formErr=''" type="button">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </transition>

            <div class="sv-modal-body">

              <!-- ══ STEP 0: Shaxsiy ══ -->
              <div v-show="formStep===0" class="fm-panel">
                <div class="fm-panel-hero">
                  <div class="fm-panel-hero-ic" style="background:linear-gradient(135deg,#8b5cf6,#8b5cf6)">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <div class="fm-panel-hero-title">Shaxsiy ma'lumotlar</div>
                    <div class="fm-panel-hero-sub">Agent haqida asosiy ma'lumotlar</div>
                  </div>
                </div>
                <div class="fm-grid2">
                  <div class="fm-field fm-field--full">
                    <label class="fm-label">To'liq ism <span class="fm-req">*</span></label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <input v-model="form.fullname" v-maydon:fullname.ota="f" class="fm-input" placeholder="Familiya Ism Sharif"/>
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Telefon raqami</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.64 13a19.79 19.79 0 01-3.07-8.67A2 2 0 013.55 2h3a2 2 0 012 1.72 12.05 12.05 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 9.91a16 16 0 006.17 6.17l1.06-1.06a2 2 0 012.11-.45 12.05 12.05 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                      <input v-model="form.telefon" v-maydon:telefon.ota="f" class="fm-input" placeholder="+998 90 000 00 00"/>
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Passport seriyasi</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 10a2 2 0 100-4 2 2 0 000 4z"/><path d="M6 20c0-2.21 2.686-4 6-4s6 1.79 6 4"/></svg>
                      <input v-model="form.passport" v-maydon:passport.ota="f" class="fm-input" placeholder="AA 0000000"/>
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Tug'ilgan sana</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <input v-model="form.tugilgan_sana" v-maydon:tugilgan_sana.ota="f" type="date" class="fm-input"/>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ══ STEP 1: Ish + Hudud ══ -->
              <div v-show="formStep===1" class="fm-panel">
                <div class="fm-panel-hero">
                  <div class="fm-panel-hero-ic" style="background:linear-gradient(135deg,#10b981,#059669)">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <div class="fm-panel-hero-title">Ish ma'lumotlari & Hudud</div>
                    <div class="fm-panel-hero-sub">Agent ishlayotgan hudud va ish shartlari</div>
                  </div>
                </div>

                <!-- Hudud tanlash — karta ko'rinishida -->
                <div class="fm-field fm-field--full">
                  <label class="fm-label">Hudud (territoriya) <span class="fm-req">*</span></label>
                  <div class="fm-hudud-grid">
                    <button
                      v-for="t in sprav.territoriyalar" :key="t.id"
                      type="button"
                      :class="['fm-hudud-card', form.territoriya_id==t.id && 'fm-hudud-card--on']"
                      @click="form.territoriya_id=t.id"
                    >
                      <span class="fm-hudud-ic">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </span>
                      <span class="fm-hudud-name">{{ t.nomi }}</span>
                      <span v-if="form.territoriya_id==t.id" class="fm-hudud-check">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    </button>
                    <div v-if="!sprav.territoriyalar.length" class="fm-hudud-empty">
                      Hududlar yuklanmadi
                    </div>
                  </div>
                </div>

                <div class="fm-grid2">
                  <div class="fm-field">
                    <label class="fm-label">Oylik plan (so'm) <span class="fm-req">*</span></label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      <NumberInput v-model="form.plan_summa" v-maydon:plan_summa.ota="f" :bosh="''" css-class="fm-input" placeholder="5 000 000"/>
                    </div>
                    <!-- Plan preview -->
                    <div v-if="form.plan_summa" class="fm-plan-preview">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                      {{ fmtS(Number(form.plan_summa)) }} so'm / oy
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Bonus foizi (%)</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                      <input v-model="form.bonus_foiz" v-maydon:bonus_foiz.ota="f" type="number" class="fm-input" placeholder="5" min="0" max="100"/>
                      <span class="fm-input-suffix">%</span>
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Kredit limiti (so'm)</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      <NumberInput v-model="form.kredit_limit" v-maydon:kredit_limit.ota="f" :bosh="''" css-class="fm-input" placeholder="10 000 000"/>
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Maksimal chegirma (%)</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      <input v-model="form.max_chegirma" v-maydon:max_chegirma.ota="f" type="number" class="fm-input" placeholder="10" min="0" max="100"/>
                      <span class="fm-input-suffix">%</span>
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Ishga kirgan sana</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <input v-model="form.ish_boshlagan" v-maydon:ish_boshlagan.ota="f" type="date" class="fm-input"/>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ══ STEP 2: Tashrif kunlari ══ -->
              <div v-show="formStep===2" class="fm-panel">
                <div class="fm-panel-hero">
                  <div class="fm-panel-hero-ic" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div>
                    <div class="fm-panel-hero-title">Tashrif kunlari</div>
                    <div class="fm-panel-hero-sub">Agent qaysi kunlari mijozlarga tashrif qiladi</div>
                  </div>
                </div>

                <div class="fm-week-grid">
                  <button
                    v-for="d in WEEKDAYS" :key="d.key"
                    type="button"
                    :class="['fm-week-card', form.tashrif_kunlari.includes(d.key) && 'fm-week-card--on']"
                    @click="toggleDay(d.key)"
                  >
                    <span class="fm-week-short">{{ d.s }}</span>
                    <span class="fm-week-full">{{ d.label }}</span>
                    <span class="fm-week-check" v-if="form.tashrif_kunlari.includes(d.key)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  </button>
                </div>

                <!-- Tanlangan kunlar summary -->
                <div class="fm-days-summary" v-if="form.tashrif_kunlari.length">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>
                    <b>{{ form.tashrif_kunlari.length }} kun</b> tanlandi:
                    {{ form.tashrif_kunlari.map(k => WEEKDAYS.find(d=>d.key===k)?.label).join(', ') }}
                  </span>
                </div>
                <div class="fm-days-empty" v-else>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Tashrif kunlarini tanlang
                </div>

                <!-- Tezkor tanlov -->
                <div class="fm-quick-days">
                  <span class="fm-quick-lbl">Tezkor:</span>
                  <button type="button" class="fm-quick-btn" @click="form.tashrif_kunlari=['Du','Se','Ch','Pa','Ju']">Ish kunlari</button>
                  <button type="button" class="fm-quick-btn" @click="form.tashrif_kunlari=['Du','Ch','Ju']">Uch kun</button>
                  <button type="button" class="fm-quick-btn" @click="form.tashrif_kunlari=['Se','Pa','Sh']">Alt kun</button>
                  <button type="button" class="fm-quick-btn fm-quick-btn--red" @click="form.tashrif_kunlari=[]">Tozalash</button>
                </div>
              </div>

              <!-- ══ STEP 3: Marshrut ══ -->
              <div v-show="formStep===3" class="fm-panel">
                <div class="fm-panel-hero">
                  <div class="fm-panel-hero-ic" style="background:linear-gradient(135deg,#7c3aed,#5b21b6)">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                  </div>
                  <div>
                    <div class="fm-panel-hero-title">Marshrut va joylashuv</div>
                    <div class="fm-panel-hero-sub">Agent harakatlanish yo'nalishi va transport</div>
                  </div>
                </div>

                <!-- Transport tanlash — katta vizual kartalar -->
                <div class="fm-field fm-field--full">
                  <label class="fm-label">Transport turi</label>
                  <div class="fm-transport-grid">
                    <button v-for="tr in TRANSPORT_TYPES" :key="tr.key"
                      type="button"
                      :class="['fm-tr-card', form.transport===tr.key && 'fm-tr-card--on']"
                      @click="form.transport=tr.key"
                    >
                      <span class="fm-tr-icon" v-html="tr.svg"/>
                      <span class="fm-tr-name">{{ tr.label }}</span>
                      <span v-if="form.transport===tr.key" class="fm-tr-check">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    </button>
                  </div>
                </div>

                <div class="fm-grid2">
                  <div class="fm-field fm-field--full">
                    <label class="fm-label">Boshlang'ich manzil</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                      <input v-model="form.boshlanish_manzil" v-maydon:boshlanish_manzil.ota="f" class="fm-input" placeholder="Uy manzili: Shahar, ko'cha, uy..."/>
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Mashina raqami</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      <input v-model="form.mashina_raqam" v-maydon:mashina_raqam.ota="f" class="fm-input" placeholder="01A 123 AA"/>
                    </div>
                  </div>
                  <div class="fm-field">
                    <label class="fm-label">Harakatlanish radiusi (km)</label>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                      <input v-model="form.radius_km" v-maydon:radius_km.ota="f" type="number" class="fm-input" placeholder="50"/>
                      <span class="fm-input-suffix">km</span>
                    </div>
                  </div>
                </div>

                <!-- Avtolavka rejimi -->
                <div class="fm-field fm-field--full">
                  <label class="fm-check-card" :class="{ 'fm-check-card--on': form.avtolavka }">
                    <input type="checkbox" v-model="form.avtolavka" class="fm-check-input"/>
                    <span class="fm-check-box">
                      <svg v-if="form.avtolavka" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    <span class="fm-check-txt">
                      <b>Won Sell (ko'chma savdo)</b>
                      <small>Agent tovarni mashinaga yuklab yuradi: mobil sotuvi darhol yetkazilgan hisoblanadi, chiqim uning omboridan tushadi, kun oxirida qoldiq va naqd solishtiriladi</small>
                    </span>
                  </label>
                </div>

                <!-- Mobil ilova kirishi -->
                <div class="fm-field fm-field--full fm-mobil">
                  <label class="fm-label">Mobil ilova kirishi</label>
                  <div class="fm-mobil-row">
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
                      <input v-model.trim="form.login" v-maydon:login.ota="f" class="fm-input" placeholder="Login (masalan: agent1)" autocomplete="off" autocapitalize="none"/>
                    </div>
                    <div class="fm-input-wrap">
                      <svg class="fm-input-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      <input v-model="form.parol" v-maydon:parol.ota="f" class="fm-input" :placeholder="modal?.id ? 'Yangi parol (bo\'sh — o\'zgarmaydi)' : 'Parol (kamida 4 belgi)'" autocomplete="new-password"/>
                    </div>
                  </div>
                  <small class="fm-hint">Agent telefondagi ilovaga shu login va parol bilan kiradi. Login bo'sh bo'lsa — ilovaga kira olmaydi.</small>
                </div>

                <!-- Izoh -->
                <div class="fm-field fm-field--full">
                  <label class="fm-label">Qo'shimcha izoh</label>
                  <div class="fm-textarea-wrap">
                    <textarea v-model="form.izoh" class="fm-textarea" rows="3" placeholder="Marshrut yoki ish haqida qo'shimcha ma'lumot..."/>
                  </div>
                </div>
              </div>

            </div>

            <div class="sv-modal-ft">
              <button class="sv-btn-cancel" @click="modal=null">Bekor qilish</button>
              <div class="fm-footer-nav">
                <button v-if="formStep>0" class="fm-prev-btn" type="button" @click="formStep--">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
                  Orqaga
                </button>
                <button v-if="formStep<FORM_STEPS.length-1" class="fm-next-btn" type="button" @click="nextStep">
                  Davom etish
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button v-else class="sv-btn-save" :disabled="saving" @click="saveAgent">
                  <span v-if="saving" class="sv-spin-sm"/>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { agentApi } from '@/api/api'
import { fonQatlam } from '@/utils/xarita'
import { useToast } from '@/composables/useToast'
import { useForma } from '@/validation/useForma'
import * as sx from '@/validation/sxemalar'

const toast = useToast()

// ── Constants ─────────────────────────────────────────────
const PERIODS = [{ key:'today',label:'Bugun' },{ key:'week',label:'Hafta' },{ key:'month',label:'Oy' }]
const SORTS   = [{ key:'plan',label:'Plan' },{ key:'mijozlar',label:'Mijozlar' },{ key:'savdo',label:'Savdo' }]
const WEEKDAYS = [
  { key:'Du', s:'Du', label:'Dushanba'   },
  { key:'Se', s:'Se', label:'Seshanba'   },
  { key:'Ch', s:'Ch', label:'Chorshanba' },
  { key:'Pa', s:'Pa', label:'Payshanba'  },
  { key:'Ju', s:'Ju', label:'Juma'       },
  { key:'Sh', s:'Sh', label:'Shanba'     },
  { key:'Ya', s:'Ya', label:'Yakshanba'  },
]
const FORM_STEPS = [
  { key:'shaxsiy',  label:'Shaxsiy'  },
  { key:'ish',      label:'Ish & Hudud' },
  { key:'tashrif',  label:'Tashrif'  },
  { key:'marshrut', label:'Marshrut' },
]
const TRANSPORT_TYPES = [
  { key:'avto',   label:'Avtomobil', svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
  { key:'moto',   label:'Moto',      svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17V5l-4 4m9-3h-5"/><path d="M8 17h8"/></svg>` },
  { key:'piyoda', label:'Piyoda',    svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7l-3 5h6l-1.5 6M9 12l-2 6M15 12l2 6"/></svg>` },
  { key:'velosiped', label:'Velosiped', svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5L9 7l-4.5 2M15 6l1 5H9"/></svg>` },
  { key:'boshqa', label:'Boshqa',    svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>` },
]
const COLORS  = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const SINF_C  = { A:'#10b981', B:'#7c3aed', C:'#f59e0b', D:'#ef4444' }

function agentColor(id) { return COLORS[id % COLORS.length] }
function sinfColor(s)   { return SINF_C[s] || '#94a3b8' }
function planColor(p)   { return p>=80?'#10b981':p>=50?'#f59e0b':'#ef4444' }
function planBadge(p)   { const c=planColor(p); return { background:c+'18', color:c, borderColor:c+'35' } }
function initials(n)    { return (n||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() }
function fmtS(v) {
  if (!v) return '0'
  if (v>=1e9) return (v/1e9).toFixed(1)+' mlrd'
  if (v>=1e6) return (v/1e6).toFixed(1)+' mln'
  if (v>=1e3) return (v/1e3).toFixed(0)+' ming'
  return String(v)
}
function fmtN(v) { return v ? Number(v).toLocaleString('uz-UZ') : '0' }

// ── State ─────────────────────────────────────────────────
const period       = ref('month')
const loading      = ref(true)
const agents       = ref([])
const sprav        = ref({ territoriyalar:[], agentlar:[] })
const selectedAgent  = ref(null)
const agentMijozlar  = ref([])
const agentArizalar  = ref([])
const arizalarLoading = ref(false)
const detailTab    = ref('umumiy')
const searchQ      = ref('')
const filterHudud  = ref('')
const sortBy       = ref('plan')
const viewMode     = ref('grid')
const mijozSearch  = ref('')
const mijozSinf    = ref('')
const mijozStatus  = ref('')
const detailRef    = ref(null)

// form
const modal     = ref(null)
const form      = ref(emptyForm())
const formErr   = ref('')
const f = useForma(sx.agent, () => form.value)
// Maydon qaysi qadamda — xato bo'lsa o'sha qadam ochiladi
const MAYDON_QADAM = { fullname: 0, telefon: 0, passport: 0, tugilgan_sana: 0, plan_summa: 1, bonus_foiz: 1, kredit_limit: 1, max_chegirma: 1, ish_boshlagan: 1,
  boshlanish_manzil: 3, mashina_raqam: 3, radius_km: 3, login: 3, parol: 3 }
const qadamXato = (qadam) => Object.keys(f.xatolar.value).find(k => MAYDON_QADAM[k] === qadam)
const saving    = ref(false)
const formStep  = ref(0)

function emptyForm() {
  return {
    fullname:'', telefon:'', passport:'', tugilgan_sana:'',
    territoriya_id:'', plan_summa:'', bonus_foiz:'', ish_boshlagan:'',
    tashrif_kunlari:[], boshlanish_manzil:'', transport:'',
    kredit_limit:'', max_chegirma:'', izoh:'',
    mashina_raqam:'', radius_km:'', avtolavka:false,
    login:'', parol:''
  }
}

function nextStep() {
  // Joriy qadamdagi maydonlar to'g'ri bo'lmaguncha keyingisiga o'tilmaydi
  const k = qadamXato(formStep.value)
  if (k) { Object.keys(MAYDON_QADAM).filter(x => MAYDON_QADAM[x] === formStep.value).forEach(f.tegdi); formErr.value = f.xatolar.value[k]; return }
  formErr.value = ''
  formStep.value++
}

function openAdd() {
  form.value = emptyForm()
  formErr.value = ''
  f.tozala()
  formStep.value = 0
  modal.value = { id: null }
}
function openEdit(agent) {
  form.value = {
    fullname:          agent.fullname || '',
    telefon:           agent.telefon || '',
    passport:          agent.passport || '',
    tugilgan_sana:     agent.tugilgan_sana || '',
    territoriya_id:    agent.territoriya_id || '',
    plan_summa:        agent.plan_summa || '',
    bonus_foiz:        agent.bonus_foiz || '',
    ish_boshlagan:     agent.ish_boshlagan || '',
    tashrif_kunlari:   Array.isArray(agent.tashrif_kunlari) ? [...agent.tashrif_kunlari] : [],
    boshlanish_manzil: agent.boshlanish_manzil || '',
    transport:         agent.transport || '',
    kredit_limit:      agent.kredit_limit || '',
    max_chegirma:      agent.max_chegirma || '',
    izoh:              agent.izoh || '',
    mashina_raqam:     agent.mashina_raqam || '',
    radius_km:         agent.radius_km || '',
    avtolavka:         !!agent.avtolavka,
    login:             agent.login || '',
    parol:             '',   // hech qachon to'ldirilmaydi — bo'sh qolsa o'zgarmaydi
  }
  formErr.value = ''
  f.tozala()
  formStep.value = 0
  modal.value = { id: agent.id }
}

function toggleDay(key) {
  const arr = form.value.tashrif_kunlari
  const i = arr.indexOf(key)
  i === -1 ? arr.push(key) : arr.splice(i, 1)
}

async function saveAgent() {
  if (saving.value) return
  if (!f.tekshir()) {
    const k = Object.keys(f.xatolar.value)[0]
    formStep.value = MAYDON_QADAM[k] ?? 0
    formErr.value = f.xatolar.value[k]
    toast.warning("Maydon noto'g'ri", formErr.value)
    return
  }
  formErr.value = ''
  saving.value = true
  const isEdit = !!modal.value.id
  try {
    const body = {
      ...form.value,
      // Bo'sh string → null (backend sanitize qilsa ham frontend ham tozalasin)
      tugilgan_sana:  form.value.tugilgan_sana  || null,
      ish_boshlagan:  form.value.ish_boshlagan  || null,
      transport:      form.value.transport      || null,
      mashina_raqam:  form.value.mashina_raqam  || null,
      boshlanish_manzil: form.value.boshlanish_manzil || null,
      izoh:           form.value.izoh           || null,
      plan_summa:     Number(form.value.plan_summa)   || 0,
      bonus_foiz:     Number(form.value.bonus_foiz)   || 0,
      kredit_limit:   Number(form.value.kredit_limit) || 0,
      max_chegirma:   Number(form.value.max_chegirma) || 0,
      radius_km:      form.value.radius_km ? Number(form.value.radius_km) : null,
      territoriya_id: form.value.territoriya_id ? Number(form.value.territoriya_id) : null,
      login:          form.value.login || null,
      parol:          form.value.parol || null,
    }
    if (isEdit) {
      await agentApi.update(modal.value.id, body)
      toast.success('Agent yangilandi', `${form.value.fullname} ma'lumotlari saqlandi`)
    } else {
      await agentApi.create(body)
      toast.success("Agent qo'shildi", `${form.value.fullname} muvaffaqiyatli ro'yxatga kiritildi`)
    }
    await load()
    formStep.value = 0
    modal.value = null
  } catch (e) {
    const msg = f.server(e) || 'Xatolik yuz berdi'
    formErr.value = msg
    const k = Object.keys(MAYDON_QADAM).find(x => f.xato(x))
    if (k) formStep.value = MAYDON_QADAM[k]
    toast.error(isEdit ? 'Saqlashda xatolik' : "Qo'shishda xatolik", msg)
  } finally {
    saving.value = false
  }
}

async function deleteAgent(agent) {
  if (!confirm(`"${agent.fullname}" agentini o'chirishni tasdiqlaysizmi?`)) return
  try {
    await agentApi.delete(agent.id)
    if (selectedAgent.value?.id === agent.id) selectedAgent.value = null
    toast.success("Agent o'chirildi", `${agent.fullname} ro'yxatdan olib tashlandi`)
    await load()
  } catch (e) {
    // Tarixi bor agentni backend o'chirmaydi — o'rniga nofaol qilish taklif etiladi
    if (e.status === 400 && agent.faol !== false && confirm(`${e.message}\n\n"${agent.fullname}" ni o'chirish o'rniga NOFAOL qilaymi?`)) {
      try { await agentApi.toggleFaol(agent.id); toast.success('Nofaol qilindi', agent.fullname); await load() }
      catch (x) { toast.error('Xatolik', x.message || '') }
    } else toast.error("O'chirishda xatolik", e.message || 'Xatolik yuz berdi')
  }
}

// ── Load ──────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    // Spravochnik (territoriyalar) va agentlar statistikasi parallel
    const [spravRes, statsRes] = await Promise.all([
      agentApi.spravochnik(),
      agentApi.statistika(period.value),
    ])

    sprav.value = {
      territoriyalar: spravRes?.territoriyalar || [],
      agentlar:       spravRes?.agentlar || [],
    }

    // Backend dan kelgan agentlar statistika bilan
    const rawAgents = statsRes?.agentlar || []

    agents.value = rawAgents.map(a => normalizeAgent(a))

    // Tanlangan agentni yangilaymiz
    if (selectedAgent.value) {
      const upd = agents.value.find(a => a.id === selectedAgent.value.id)
      if (upd) {
        selectedAgent.value = upd
        // Mijozlarni yangilash
        try {
          const detail = await agentApi.getById(upd.id, { period: period.value })
          agentMijozlar.value = detail.mijozlar || []
        } catch (e) { toast.error("Agent mijozlarini yangilab bo'lmadi", e.message || '') }
      }
    }
  } catch(e) {
    console.error(e)
    toast.error('Yuklashda xatolik', e.message || 'Server bilan aloqa yo\'q')
  }
  finally { loading.value = false }
}

// Backend agentni frontend formatiga normalize qilish
function normalizeAgent(a) {
  const plan_summa     = parseFloat(a.plan_summa)  || 0
  const fakt_summa     = parseFloat(a.fakt_summa)  || 0
  const plan_pct       = plan_summa > 0 ? Math.min(Math.round(fakt_summa / plan_summa * 100), 999) : 0
  const tashrif_kunlari = Array.isArray(a.tashrif_kunlari)
    ? a.tashrif_kunlari
    : (a.tashrif_kunlari ? String(a.tashrif_kunlari).split(',').map(s => s.trim()).filter(Boolean) : [])
  return {
    id:                a.id,
    fullname:          a.fullname        || '',
    telefon:           a.telefon         || '',
    passport:          a.passport        || '',
    tugilgan_sana:     a.tugilgan_sana   || '',
    territoriya_id:    a.territoriya_id  || null,
    territoriya:       a.territoriya     || null,
    hudud:             a.territoriya?.nomi || '',
    plan_summa,
    fakt_summa,
    plan_pct,
    bonus_foiz:        parseFloat(a.bonus_foiz)   || 0,
    kredit_limit:      parseFloat(a.kredit_limit) || 0,
    max_chegirma:      parseFloat(a.max_chegirma) || 0,
    ish_boshlagan:     a.ish_boshlagan   || '',
    tashrif_kunlari,
    boshlanish_manzil: a.boshlanish_manzil || '',
    transport:         a.transport        || '',
    mashina_raqam:     a.mashina_raqam    || '',
    radius_km:         a.radius_km        || null,
    izoh:              a.izoh             || '',
    faol:              a.faol !== false,
    mijozlar_soni:     a.mijozlar_soni    || 0,
    faol_mijozlar:     a.faol_mijozlar    || 0,
    buyurtmalar_soni:  a.buyurtmalar_soni || 0,
    bugungi_tashrif:   a.bugungi_tashrif  || 0,
    sinflar:           a.sinflar          || [],
    bonus_summa:       parseFloat(a.bonus_summa) || 0,
    qolgan_plan:       a.qolgan_plan != null ? parseFloat(a.qolgan_plan) : Math.max(0, plan_summa - fakt_summa),
    online:            !!a.online,
  }
}

// ── Computed ──────────────────────────────────────────────
const filteredAgents = computed(() => {
  let list = agents.value
  if (searchQ.value) { const q=searchQ.value.toLowerCase(); list=list.filter(a=>a.fullname?.toLowerCase().includes(q)) }
  if (filterHudud.value) list = list.filter(a => a.territoriya_id == filterHudud.value)
  return [...list].sort((a,b)=>{
    if (sortBy.value==='plan')     return b.plan_pct - a.plan_pct
    if (sortBy.value==='mijozlar') return b.mijozlar_soni - a.mijozlar_soni
    if (sortBy.value==='savdo')    return b.fakt_summa - a.fakt_summa
    return 0
  })
})

const filteredMijozlar = computed(() => {
  let list = agentMijozlar.value
  if (mijozSearch.value) { const q=mijozSearch.value.toLowerCase(); list=list.filter(m=>m.nomi?.toLowerCase().includes(q)||m.manzil?.toLowerCase().includes(q)) }
  if (mijozSinf.value) list = list.filter(m=>m.sinf===mijozSinf.value)
  if (mijozStatus.value==='faol')   list = list.filter(m=>m.faol)
  if (mijozStatus.value==='nofaol') list = list.filter(m=>!m.faol)
  return list
})

const kpiCards = computed(() => {
  const tm = agents.value.reduce((s,a)=>s+a.mijozlar_soni,0)
  const tt = agents.value.reduce((s,a)=>s+a.bugungi_tashrif,0)
  const tb = agents.value.reduce((s,a)=>s+a.buyurtmalar_soni,0)
  const ts = agents.value.reduce((s,a)=>s+a.fakt_summa,0)
  const on = agents.value.filter(a=>a.online).length
  return [
    { key:'a', label:'Jami agentlar',     value:agents.value.length, trend:5,  color:'#8b5cf6', bg:'rgba(139,92,246,.1)', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
    { key:'o', label:'Hozir onlayn',       value:on,                 trend:0,  color:'#8b5cf6', bg:'rgba(139,92,246,.1)', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.64 13a19.79 19.79 0 01-3.07-8.67A2 2 0 013.55 2h3a2 2 0 012 1.72 12.05 12.05 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 9.91a16 16 0 006.17 6.17l1.06-1.06a2 2 0 012.11-.45 12.05 12.05 0 002.81.7A2 2 0 0122 16.92z"/></svg>` },
    { key:'m', label:'Jami mijozlar',      value:tm,                 trend:3,  color:'#7c3aed', bg:'rgba(124,58,237,.1)', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
    { key:'t', label:'Bugungi tashriflar', value:tt,                 trend:-2, color:'#8b5cf6', bg:'rgba(139,92,246,.1)', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>` },
    { key:'s', label:"Umumiy savdo",       value:fmtS(ts)+' so\'m',  trend:8,  color:'#8b5cf6', bg:'rgba(139,92,246,.1)', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>` },
  ]
})

const agentKpi = computed(() => {
  if (!selectedAgent.value) return []
  const a = selectedAgent.value
  return [
    { key:'m', label:'Mijozlar',      value:a.mijozlar_soni,          color:'#8b5cf6', bg:'rgba(139,92,246,.1)',  icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
    { key:'t', label:'Bugun tashrif', value:a.bugungi_tashrif,        color:'#8b5cf6', bg:'rgba(139,92,246,.1)',  icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>` },
    { key:'b', label:'Buyurtmalar',   value:a.buyurtmalar_soni,       color:'#8b5cf6', bg:'rgba(139,92,246,.1)',  icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>` },
    { key:'p', label:'Plan',          value:a.plan_pct+'%',           color:planColor(a.plan_pct), bg:planColor(a.plan_pct)+'15', icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>` },
    { key:'s', label:"Savdo (so'm)",  value:fmtS(a.fakt_summa),      color:'#8b5cf6', bg:'rgba(139,92,246,.1)',  icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>` },
    { key:'k', label:'Kredit limiti', value:a.kredit_limit?fmtS(Number(a.kredit_limit)):'—', color:'#7c3aed', bg:'rgba(124,58,237,.1)', icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>` },
  ]
})

const DETAIL_TABS = computed(() => [
  { key:'umumiy',  label:'Umumiy',          cnt:undefined,                    icon:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
  { key:'reja',    label:'Reja',            cnt:agentArizalar.value.length,   icon:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>` },
  { key:'mijozlar',label:'Mijozlar',        cnt:agentMijozlar.value.length,   icon:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
  { key:'marshrut',label:'Marshrut',        cnt:undefined,                    icon:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>` },
  { key:'tashrif', label:'Tashrif jadvali', cnt:undefined,                    icon:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
])

const rankedAgents = computed(() => [...agents.value].sort((a,b)=>b.plan_pct-a.plan_pct))

function getMijozlarByDay(day) {
  return agentMijozlar.value.filter(m => {
    const tk = m.tashrif_kunlari
    if (!tk) return false
    const arr = Array.isArray(tk) ? tk : String(tk).split(',').map(s => s.trim())
    return arr.includes(day)
  })
}
function actPct(day) {
  const mx = Math.max(...WEEKDAYS.map(d=>getMijozlarByDay(d.key).length),1)
  return Math.round(getMijozlarByDay(day).length/mx*100)
}

async function selectAgent(agent) {
  if (selectedAgent.value?.id === agent.id) { selectedAgent.value = null; return }
  selectedAgent.value  = agent
  detailTab.value      = 'umumiy'
  mijozSearch.value    = ''
  mijozSinf.value      = ''
  mijozStatus.value    = ''
  agentMijozlar.value  = []
  agentArizalar.value  = []
  await nextTick()
  detailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  try {
    const detail = await agentApi.getById(agent.id, { period: period.value })
    agentMijozlar.value = (detail.mijozlar || []).map(m => ({
      ...m,
      tashrif_kunlari: typeof m.tashrif_kunlari === 'string'
        ? m.tashrif_kunlari
        : (Array.isArray(m.tashrif_kunlari) ? m.tashrif_kunlari.join(',') : ''),
    }))
    const updated = normalizeAgent({ ...agent, ...detail })
    selectedAgent.value = updated
    const idx = agents.value.findIndex(a => a.id === agent.id)
    if (idx !== -1) agents.value[idx] = updated
  } catch (e) {
    console.error('Agent detail load error:', e)
  }
  // Reja: agent arizalarini yuklash
  loadAgentArizalar(agent.id)
}

async function loadAgentArizalar(agentId) {
  arizalarLoading.value = true
  try {
    // @ts-ignore
    const { arizaApi } = await import('@/api/api')
    const data = await arizaApi.getAll({ agent_id: agentId, limit: 100 })
    agentArizalar.value = (data.rows || data || [])
      .filter(a => a.holat === 'tasdiqlangan')
      .sort((a, b) => {
        if (!a.jonatish_sana) return 1
        if (!b.jonatish_sana) return -1
        return new Date(a.jonatish_sana).getTime() - new Date(b.jonatish_sana).getTime()
      })
  } catch { agentArizalar.value = [] }
  finally { arizalarLoading.value = false }
}

// Reja tab o'zgarganda yuklash
function onDetailTabChange(key) {
  detailTab.value = key
  if (key === 'reja' && selectedAgent.value && !agentArizalar.value.length && !arizalarLoading.value) {
    loadAgentArizalar(selectedAgent.value.id)
  }
}

// Sana bo'yicha guruhlab
const rejaByDate = computed(() => {
  const map = {}
  for (const a of agentArizalar.value) {
    const key = a.jonatish_sana || 'Sana_belgilanmagan'
    if (!map[key]) map[key] = []
    map[key].push(a)
  }
  return Object.entries(map)
    .sort(([a], [b]) => {
      if (a === 'Sana_belgilanmagan') return 1
      if (b === 'Sana_belgilanmagan') return -1
      return new Date(a).getTime() - new Date(b).getTime()
    })
    .map(([date, items]) => ({ date, items }))
})

// Reja helpers
const REJA_COLORS = ['#8b5cf6','#10b981','#7c3aed','#f59e0b','#8b5cf6','#8b5cf6']
const rejaAvatarColor = (id) => REJA_COLORS[id % REJA_COLORS.length]
function fmtRejaDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  const kunlar = ['Yak','Du','Se','Ch','Pa','Ju','Sh']
  const oylar  = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
  return `${kunlar[d.getDay()]}, ${d.getDate()} ${oylar[d.getMonth()]} ${d.getFullYear()}`
}

// ── Map ───────────────────────────────────────────────────
// ── Transport label ────────────────────────────────────────
const TRANSPORT_LABELS = {
  avto: 'Avtomobil', moto: 'Moto', piyoda: 'Piyoda',
  velosiped: 'Velosiped', boshqa: 'Boshqa',
}

// ── Map state ──────────────────────────────────────────────
let routeMap      = null
let L             = null
let markersLayer  = null
let roadLayer     = null   // real yo'l qatlamlari
let userMarker    = null

const userLocation   = ref(null)
const geoLoading     = ref(false)
const routeLoading   = ref(false)
const optimizedRoute = ref([])
const activeStop     = ref(null)
const segmentDists   = ref([])   // km, har segment uchun
const segmentTimes   = ref([])   // daqiqa, har segment uchun

// ── Transport → OSRM profile xaritasi ─────────────────────
const OSRM_PROFILE = {
  avto:      'driving',
  moto:      'driving',
  piyoda:    'walking',
  velosiped: 'cycling',
  boshqa:    'driving',
}

// ── Computed ───────────────────────────────────────────────
const routePoints = computed(() =>
  agentMijozlar.value.filter(m => m.lat && m.lng)
)

const routeTotalKm = computed(() => {
  const d = segmentDists.value.reduce((s, v) => s + v, 0)
  return d > 0 ? d.toFixed(1) : '—'
})

const routeTotalMin = computed(() => {
  const t = segmentTimes.value.reduce((s, v) => s + v, 0)
  return t > 0 ? t : null
})

const routeEstTime = computed(() => {
  const t = routeTotalMin.value
  if (!t) return '—'
  if (t < 60) return Math.round(t) + ' min'
  return Math.floor(t / 60) + 'h ' + Math.round(t % 60) + 'min'
})

// ── Haversine (fallback uchun) ─────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, d2r = Math.PI / 180
  const dLat = (lat2 - lat1) * d2r
  const dLng = (lng2 - lng1) * d2r
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*d2r) * Math.cos(lat2*d2r) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Transport profili ──────────────────────────────────────
const routeProfile = computed(() =>
  OSRM_PROFILE[selectedAgent.value?.transport] || 'driving'
)

// ────────────────────────────────────────────────────────────
// OSRM /trip  — bitta so'rovda: optimal tartib + real yo'l
// roundtrip=false source=first destination=last
// ────────────────────────────────────────────────────────────
async function osrmTrip(waypoints, profile = 'driving') {
  // OSRM koordinatalar: "lng,lat;lng,lat;..."
  const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';')
  const url = `https://router.project-osrm.org/trip/v1/${profile}/${coords}` +
    `?overview=full&geometries=geojson&steps=false` +
    `&roundtrip=false&source=first&destination=last`
  const res  = await fetch(url, { signal: AbortSignal.timeout(12000) })
  const data = await res.json()
  if (data.code !== 'Ok') throw new Error(data.message || 'OSRM trip xatosi')
  return data   // { trips, waypoints }
}

// ── Map init ───────────────────────────────────────────────
async function initMap(agentId) {
  L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  await nextTick()

  const el = document.getElementById(`sv-map-${agentId}`)
  if (!el) return
  if (routeMap) { routeMap.remove(); routeMap = null }

  routeMap = L.map(el, { zoomControl: false }).setView([41.2995, 69.2401], 12)

  fonQatlam(L).addTo(routeMap)

  L.control.zoom({ position: 'bottomright' }).addTo(routeMap)
  L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(routeMap)

  markersLayer = L.layerGroup().addTo(routeMap)
  roadLayer    = L.layerGroup().addTo(routeMap)

  await buildRoute(userLocation.value)
}

// ── Marshrut qurish — bitta OSRM /trip so'rovi ────────────
async function buildRoute(start) {
  if (!routeMap || !L) return
  if (markersLayer) markersLayer.clearLayers()
  if (roadLayer)    roadLayer.clearLayers()
  if (userMarker)   { userMarker.remove(); userMarker = null }

  const pts = routePoints.value
  if (!pts.length) return

  const agColor = agentColor(selectedAgent.value?.id)

  // Waypoints: [start?, ...mijozlar]
  // Agar start yo'q bo'lsa — faqat mijozlarni yuboramiz
  const startPt   = start || null
  const mjWaypts  = pts.map(m => ({ lat: +m.lat, lng: +m.lng, _ref: m }))
  const allWaypts = startPt
    ? [startPt, ...mjWaypts]
    : mjWaypts

  // 1. Darhol markerlar — tartibsiz, keyin qayta chiziladi
  const tempOrdered = mjWaypts.map(w => w._ref)
  optimizedRoute.value = tempOrdered
  drawMarkers(startPt || mjWaypts[0], tempOrdered, agColor, startPt)
  fitMapBounds()

  routeLoading.value = true
  try {
    // 2. OSRM /trip — 1 so'rov, barcha yo'l + optimal tartib
    const data = await osrmTrip(allWaypts, routeProfile.value)

    // OSRM waypoint_index → asl qaysi indeks ekanini bilish
    // data.waypoints[i].waypoint_index — bu nuqta trip da qaysi o'rinda
    // data.waypoints[i].trips_index   — qaysi trip ga tegishli (odatda 0)
    // Agar start bor bo'lsa, data.waypoints[0] = start, qolganlari mijozlar
    const mjOffset = startPt ? 1 : 0

    // OSRM trip da qaytgan tartib bo'yicha mijozlarni joylashtiramiz
    const orderedByTrip = new Array(mjWaypts.length)
    data.waypoints.slice(mjOffset).forEach((wp, localIdx) => {
      const tripPos = wp.waypoint_index - (startPt ? 1 : 0)
      orderedByTrip[tripPos] = mjWaypts[localIdx]._ref
    })
    // undefined bo'lgan joylarni tozalash (OSRM ba'zida skip qilishi mumkin)
    const ordered = orderedByTrip.filter(Boolean)

    optimizedRoute.value = ordered

    // 3. Segment masofa va vaqtlarini legs dan olamiz
    // data.trips[0].legs[i] — i-segment
    const legs = data.trips[0]?.legs || []
    segmentDists.value = legs.map(leg =>
      parseFloat((leg.distance / 1000).toFixed(2))
    )
    segmentTimes.value = legs.map(leg =>
      parseFloat((leg.duration / 60).toFixed(1))
    )

    // 4. Markerlarni to'g'ri tartibda qayta chizamiz
    if (markersLayer) markersLayer.clearLayers()
    if (userMarker)   { userMarker.remove(); userMarker = null }
    drawMarkers(startPt || { lat: +ordered[0]?.lat, lng: +ordered[0]?.lng }, ordered, agColor, startPt)

    // 5. Real yo'l geometriyasini chizamiz (bitta uzluksiz chiziq)
    const fullCoords = data.trips[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
    drawRoadLine(fullCoords, agColor)

  } catch (e) {
    console.warn('OSRM /trip xatosi, fallback:', e.message)
    // Fallback: haversine tartib + to'g'ri chiziqlar
    fallbackRoute(startPt, mjWaypts, agColor)
  } finally {
    routeLoading.value = false
  }
}

// ── Real yo'l chizish (bitta uzluksiz GeoJSON chiziq) ─────
function drawRoadLine(coords, agColor) {
  if (!roadLayer || !L || !coords.length) return
  roadLayer.clearLayers()

  // Shadow
  L.polyline(coords, {
    color: agColor, weight: 12, opacity: 0.08,
    lineCap: 'round', lineJoin: 'round',
  }).addTo(roadLayer)

  // Oq bordyer
  L.polyline(coords, {
    color: '#fff', weight: 7, opacity: 0.95,
    lineCap: 'round', lineJoin: 'round',
  }).addTo(roadLayer)

  // Asosiy yo'l
  L.polyline(coords, {
    color: agColor, weight: 4.5, opacity: 0.95,
    lineCap: 'round', lineJoin: 'round',
  }).addTo(roadLayer)

  // Yo'nalish o'qlari — har ~150 koordinatda bir
  const step = Math.max(8, Math.floor(coords.length / 8))
  for (let k = step; k < coords.length - 1; k += step) {
    const [lat1, lng1] = coords[k]
    const [lat2, lng2] = coords[k + 1]
    // atan2: lng bo'ylab x, lat bo'ylab y — xaritada 90° tuzatish
    const angle = Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI
    L.marker([lat1, lng1], {
      icon: L.divIcon({
        html: `<div style="transform:rotate(${angle}deg);color:${agColor};
          font-size:15px;line-height:1;
          filter:drop-shadow(0 1px 3px rgba(0,0,0,.25));
          user-select:none;">▲</div>`,
        className: '',
        iconSize: [15, 15],
        iconAnchor: [7, 7],
      }),
      interactive: false,
      zIndexOffset: -500,
    }).addTo(roadLayer)
  }

  fitMapBounds()
}

// ── Fallback: haversine greedy + to'g'ri chiziqlar ────────
function fallbackRoute(startPt, mjWaypts, agColor) {
  const effectiveStart = startPt || { lat: +mjWaypts[0]._ref.lat, lng: +mjWaypts[0]._ref.lng }
  // Nearest-neighbor
  const unvisited = [...mjWaypts]
  const ordered = []
  let cur = effectiveStart
  while (unvisited.length) {
    let minD = Infinity, minI = 0
    unvisited.forEach((w, i) => {
      const d = haversine(cur.lat, cur.lng, w.lat, w.lng)
      if (d < minD) { minD = d; minI = i }
    })
    ordered.push(unvisited.splice(minI, 1)[0]._ref)
    cur = { lat: +ordered.at(-1).lat, lng: +ordered.at(-1).lng }
  }
  optimizedRoute.value = ordered

  segmentDists.value = ordered.map((m, i) => {
    const prev = i === 0 ? effectiveStart : { lat: +ordered[i-1].lat, lng: +ordered[i-1].lng }
    return parseFloat(haversine(prev.lat, prev.lng, +m.lat, +m.lng).toFixed(2))
  })
  segmentTimes.value = segmentDists.value.map(d => Math.round(d / 30 * 60))

  // Markerlar
  if (markersLayer) markersLayer.clearLayers()
  if (userMarker)   { userMarker.remove(); userMarker = null }
  drawMarkers(effectiveStart, ordered, agColor, startPt)

  // To'g'ri chiziqlar (dashArray)
  if (roadLayer) roadLayer.clearLayers()
  const coords = [
    [effectiveStart.lat, effectiveStart.lng],
    ...ordered.map(m => [+m.lat, +m.lng]),
  ]
  L.polyline(coords, {
    color: agColor, weight: 4, opacity: 0.72,
    dashArray: '12, 7', lineCap: 'round', lineJoin: 'round',
  }).addTo(roadLayer)

  fitMapBounds()
}

// ── Markerlarni chizish ────────────────────────────────────
function drawMarkers(effectiveStart, ordered, agColor, realStart) {
  // Agent "Siz" markeri
  if (realStart) {
    const html = `
      <div style="position:relative">
        <div style="width:40px;height:40px;border-radius:50%;
          background:${agColor};
          display:flex;align-items:center;justify-content:center;
          border:3px solid #fff;
          box-shadow:0 4px 20px ${agColor}70,0 0 0 6px ${agColor}22;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div style="position:absolute;top:-28px;left:50%;transform:translateX(-50%);
          background:${agColor};color:#fff;
          font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px;
          white-space:nowrap;box-shadow:0 2px 8px ${agColor}50;">
          📍 Siz
        </div>
      </div>`
    userMarker = L.marker([realStart.lat, realStart.lng], {
      icon: L.divIcon({ html, className: '', iconSize: [40, 68], iconAnchor: [20, 40] }),
      zIndexOffset: 2000,
    }).addTo(routeMap)
  }

  // Bekat markerlari
  ordered.forEach((m, i) => {
    const c   = sinfColor(m.sinf)
    const lat = +m.lat
    const lng = +m.lng

    const html = `
      <div style="position:relative;cursor:pointer">
        <div style="width:36px;height:36px;border-radius:50%;
          background:${c};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;font-weight:900;
          border:3px solid #fff;
          box-shadow:0 4px 14px ${c}55,0 0 0 3px ${c}25;">
          ${i + 1}
        </div>
        <div style="position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);
          width:10px;height:10px;border-radius:50%;
          background:${c};border:2.5px solid #fff;
          box-shadow:0 2px 6px ${c}60;"></div>
      </div>`

    const distLine = segmentDists.value[i]
      ? `<div style="display:flex;align-items:center;gap:4px;margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9;">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
           <span style="font-size:11px;color:#8b5cf6;font-weight:700">${segmentDists.value[i]} km</span>
           ${segmentTimes.value[i] ? `<span style="font-size:11px;color:#94a3b8;margin-left:6px;">~ ${Math.round(segmentTimes.value[i])} min</span>` : ''}
         </div>`
      : ''

    const popup = `
      <div style="min-width:170px;font-family:system-ui,sans-serif;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:32px;height:32px;border-radius:10px;
            background:${c}20;color:${c};
            display:flex;align-items:center;justify-content:center;
            font-size:14px;font-weight:900;">${i + 1}</div>
          <div>
            <div style="font-size:13.5px;font-weight:800;color:#1e293b;">${m.nomi}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:1px;">Bekat #${i + 1}</div>
          </div>
        </div>
        ${m.sinf ? `<span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;background:${c}18;color:${c};">${m.sinf}-sinf</span>` : ''}
        ${m.manzil ? `<div style="font-size:12px;color:#475569;margin-top:8px;display:flex;gap:4px;"><span>📍</span><span>${m.manzil}</span></div>` : ''}
        ${m.telefon ? `<div style="font-size:12px;color:#475569;margin-top:4px;display:flex;gap:4px;"><span>📞</span><span>${m.telefon}</span></div>` : ''}
        ${distLine}
      </div>`

    const mk = L.marker([lat, lng], {
      icon: L.divIcon({ html, className: '', iconSize: [36, 48], iconAnchor: [18, 45] }),
    }).addTo(markersLayer)

    mk.bindPopup(popup, { maxWidth: 240, className: 'mp-popup', offset: [0, -40] })
    mk.on('click', () => { activeStop.value = m.id })
  })
}


function fitMapBounds() {
  if (!routeMap || !L) return
  const pts = routePoints.value
  if (!pts.length) return
  const all = pts.map(m => [+m.lat, +m.lng])
  if (userLocation.value) all.push([userLocation.value.lat, userLocation.value.lng])
  routeMap.fitBounds(L.latLngBounds(all), { padding: [44, 44], maxZoom: 15 })
}

// ── Geolocation ────────────────────────────────────────────
function getMyLocation() {
  if (!navigator.geolocation) {
    toast.warning('Geolokatsiya', 'Brauzer geolokatsiyani qo\'llab-quvvatlamaydi')
    return
  }
  geoLoading.value = true
  navigator.geolocation.getCurrentPosition(
    async pos => {
      userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      geoLoading.value = false
      toast.info('Joylashuv aniqlandi', 'Real yo\'l marshruti yuklanmoqda...')
      if (routeMap) routeMap.setView([userLocation.value.lat, userLocation.value.lng], 13)
      await buildRoute(userLocation.value)
      toast.success('Marshrut tayyor', `${optimizedRoute.value.length} bekat — ${routeTotalKm.value} km, ~${routeEstTime.value}`)
    },
    err => {
      geoLoading.value = false
      const msgs = { 1: 'Ruxsat berilmadi', 2: 'Joylashuv aniqlanmadi', 3: 'Vaqt tugadi' }
      toast.error('Joylashuv xatosi', msgs[err.code] || err.message)
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

// ── Optimize trigger ───────────────────────────────────────
async function optimizeRoute() {
  toast.info('Hisoblanyapti', 'Real yo\'l bo\'ylab optimal marshrut...')
  await buildRoute(userLocation.value)
  toast.success('Marshrut optimallashtirildi',
    `${optimizedRoute.value.length} bekat · ${routeTotalKm.value} km · ~${routeEstTime.value}`)
}

// ── Focus stop ─────────────────────────────────────────────
function focusStop(m) {
  activeStop.value = m.id
  if (routeMap) routeMap.setView([+m.lat, +m.lng], 16, { animate: true })
}

function getSegmentDist(i) { return segmentDists.value[i] ?? '—' }

watch(period, () => load())
watch(detailTab, async tab => {
  if (tab === 'marshrut' && selectedAgent.value) {
    await nextTick()
    await initMap(selectedAgent.value.id)
  }
})
watch(selectedAgent, a => {
  if (!a) {
    if (routeMap) { routeMap.remove(); routeMap = null }
    userLocation.value   = null
    optimizedRoute.value = []
    activeStop.value     = null
    segmentDists.value   = []
  }
})
onMounted(load)
onUnmounted(() => { if (routeMap) routeMap.remove() })
</script>

<style scoped>
.sv-wrap { display:flex; flex-direction:column; gap:18px; padding:2px 0 40px; }

/* HEADER */
.sv-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
.sv-header-left { display:flex; align-items:center; gap:14px; }
.sv-header-icon { width:46px; height:46px; border-radius:14px; background:linear-gradient(135deg,rgba(139,92,246,.15),rgba(139,92,246,.15)); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-title { font-size:22px; font-weight:900; color:#1e293b; margin:0 0 3px; letter-spacing:-.3px; }
.sv-subtitle { font-size:13px; color:#94a3b8; margin:0; }
.sv-header-right { display:flex; align-items:center; gap:10px; }
.sv-period-group { display:flex; background:var(--seg-track); box-shadow:inset 0 0 0 1px var(--seg-brd); border-radius:11px; padding:3px; gap:2px; }
.sv-period-btn { padding:6px 14px; border:none; background:transparent; border-radius:8px; font-size:13px; font-weight:500; color:var(--seg-ink); cursor:pointer; transition:.15s; }
.sv-period-btn:hover:not(.sv-period-btn--on) { color:var(--seg-ink-h); }
.sv-period-btn--on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); font-weight:600; }
.sv-add-btn { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 18px; border-radius:11px; border:none; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(139,92,246,.3); transition:.15s; }
.sv-add-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(139,92,246,.4); }
.sv-add-btn--sm { margin-top:12px; }
.sv-refresh { width:38px; height:38px; border-radius:11px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:.15s; }
.sv-refresh:hover { border-color:#8b5cf6; color:#8b5cf6; }
.sv-refresh:disabled { opacity:.5; cursor:not-allowed; }
.sv-spin { animation:rot .7s linear infinite; }
@keyframes rot { to{transform:rotate(360deg)} }

/* KPI */
.sv-kpi-row { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
.sv-kpi-card { background:#fff; border:1px solid #e8ecf8; border-radius:16px; padding:16px 18px; display:flex; align-items:center; gap:13px; transition:.2s; }
.sv-kpi-card:hover { box-shadow:0 6px 20px rgba(139,92,246,.1); transform:translateY(-2px); border-color:#ddd6fe; }
.sv-kpi-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-kpi-icon :deep(svg) { width:20px; height:20px; }
.sv-kpi-val { font-size:20px; font-weight:900; color:#1e293b; white-space:nowrap; }
.sv-kpi-lbl { font-size:11.5px; color:#94a3b8; margin-top:2px; }
.sv-kpi-trend { display:flex; align-items:center; gap:3px; font-size:11px; font-weight:700; margin-left:auto; flex-shrink:0; }

/* TOOLBAR */
.sv-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.sv-search-box { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 12px; height:38px; flex:1; min-width:200px; transition:.15s; }
.sv-search-box:focus-within { border-color:#8b5cf6; }
.sv-search-box svg { color:#94a3b8; flex-shrink:0; }
.sv-search-in { flex:1; border:none; outline:none; font-size:13.5px; color:#1e293b; background:transparent; }
.sv-search-in::placeholder { color:#cbd5e1; }
.sv-fsel { height:38px; padding:0 12px; border:1.5px solid #e2e8f0; border-radius:10px; background:#fff; font-size:13px; color:#334155; outline:none; cursor:pointer; transition:.15s; }
.sv-fsel:focus { border-color:#8b5cf6; }
.sv-sort-group { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; gap:2px; }
.sv-sort-btn { padding:6px 12px; border:none; background:transparent; border-radius:7px; font-size:12.5px; font-weight:500; color:#64748b; cursor:pointer; transition:.15s; white-space:nowrap; }
.sv-sort-btn--on { background:#fff; color:#8b5cf6; font-weight:700; box-shadow:0 1px 4px rgba(0,0,0,.08); }
.sv-view-btns { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; gap:2px; }
.sv-vbtn { width:32px; height:32px; border:none; background:transparent; border-radius:7px; display:flex; align-items:center; justify-content:center; color:#94a3b8; cursor:pointer; transition:.15s; }
.sv-vbtn--on { background:#fff; color:#8b5cf6; box-shadow:0 1px 4px rgba(0,0,0,.08); }
.sv-cnt-badge { font-size:12.5px; color:#64748b; background:#f1f5f9; padding:5px 12px; border-radius:20px; white-space:nowrap; }

/* SKELETON */
.sv-skel { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shim 1.4s ease infinite; height:240px; border-radius:20px; }
@keyframes shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* GRID */
.sv-agents-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; }
.sv-empty { text-align:center; padding:60px; color:#94a3b8; grid-column:1/-1; display:flex; flex-direction:column; align-items:center; gap:8px; }
.sv-empty svg { opacity:.35; }
.sv-empty p { margin:0; font-size:14px; }

.sv-agent-card { background:#fff; border:1.5px solid #e2e8f0; border-radius:20px; overflow:hidden; cursor:pointer; transition:.2s; display:flex; flex-direction:column; }
.sv-agent-card:hover { border-color:#ddd6fe; box-shadow:0 8px 28px rgba(139,92,246,.12); transform:translateY(-2px); }
.sv-agent-card--on { border-color:#8b5cf6 !important; box-shadow:0 8px 28px rgba(139,92,246,.2) !important; background:#fbfaff; }

.sv-card-head { display:flex; align-items:center; gap:12px; padding:18px 18px 12px; }
.sv-card-av { position:relative; width:46px; height:46px; border-radius:13px; color:#fff; font-size:17px; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-dot { position:absolute; bottom:-2px; right:-2px; border-radius:50%; border:2px solid #fff; }
.sv-dot--on { background:#10b981; }
.sv-dot--off { background:#94a3b8; }
.sv-dot { width:11px; height:11px; }
.sv-dot--sm { width:9px; height:9px; bottom:-1px; right:-1px; }
.sv-dot--lg { width:13px; height:13px; bottom:-3px; right:-3px; }
.sv-card-info { flex:1; min-width:0; }
.sv-card-name { font-size:14.5px; font-weight:800; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sv-card-meta { display:flex; align-items:center; gap:4px; font-size:11.5px; color:#94a3b8; margin-top:2px; }
.sv-card-meta svg { flex-shrink:0; }
.sv-plan-badge { font-size:12px; font-weight:800; padding:4px 10px; border-radius:20px; border:1.5px solid; flex-shrink:0; }

.sv-card-stats { display:flex; align-items:center; background:#f8fafc; margin:0 18px; border-radius:12px; padding:10px 8px; }
.sv-stat { flex:1; text-align:center; }
.sv-stat-val { font-size:17px; font-weight:900; color:#1e293b; }
.sv-stat-lbl { font-size:10px; color:#94a3b8; margin-top:2px; }
.sv-stat-div { width:1px; height:30px; background:#e2e8f0; flex-shrink:0; }

.sv-card-plan { padding:12px 18px 8px; display:flex; flex-direction:column; gap:5px; }
.sv-plan-row { display:flex; justify-content:space-between; }
.sv-plan-lbl { font-size:11px; color:#64748b; }
.sv-plan-track { height:7px; background:#f1f5f9; border-radius:99px; overflow:hidden; }
.sv-plan-fill { height:100%; border-radius:99px; transition:width .5s ease; }

.sv-card-days { display:flex; gap:4px; flex-wrap:wrap; padding:0 18px 8px; }
.sv-day-chip { font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; }

.sv-card-foot { display:flex; align-items:center; justify-content:space-between; padding:10px 14px 10px 18px; border-top:1px solid #f1f5f9; margin-top:auto; }
.sv-card-foot-actions { display:flex; gap:6px; }
.sv-ic-btn { width:28px; height:28px; border-radius:8px; border:1.5px solid; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.13s; }
.sv-ic-btn--edit { border-color:#ede9fe; color:#8b5cf6; }
.sv-ic-btn--edit:hover { background:#ede9fe; border-color:#ddd6fe; }
.sv-ic-btn--del { border-color:#fee2e2; color:#ef4444; }
.sv-ic-btn--del:hover { background:#fef2f2; }
.sv-card-see { display:flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:#8b5cf6; }

/* LIST VIEW */
.sv-list-wrap { border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; background:#fff; }
.sv-list-tbl { width:100%; border-collapse:collapse; font-size:13.5px; white-space:nowrap; }
.sv-list-tbl thead tr { background:#f8fafc; border-bottom:1.5px solid #e2e8f0; }
.sv-list-tbl th { padding:11px 16px; text-align:left; font-size:10.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; }
.sv-list-tbl td { padding:0 16px; height:56px; vertical-align:middle; border-bottom:1px solid #f1f5f9; }
.sv-list-row { cursor:pointer; transition:background .1s; }
.sv-list-row:last-child td { border-bottom:none; }
.sv-list-row:hover td { background:#f8fafc; }
.sv-list-row--on td { background:#fbfaff; }
.sv-list-idx { color:#cbd5e1; font-size:12px; width:36px; }
.sv-list-agent { display:flex; align-items:center; gap:10px; }
.sv-list-av { position:relative; width:36px; height:36px; border-radius:10px; color:#fff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-list-av--xs { width:28px; height:28px; border-radius:8px; font-size:11px; }
.sv-list-name { font-size:14px; font-weight:700; color:#1e293b; }
.sv-list-sub { font-size:11px; color:#94a3b8; }
.sv-num { font-size:14px; font-weight:700; color:#1e293b; }
.sv-list-plan { display:flex; align-items:center; gap:8px; }
.sv-list-plan-bar { flex:1; height:6px; background:#f1f5f9; border-radius:99px; overflow:hidden; min-width:70px; }
.sv-list-plan-bar div { height:100%; border-radius:99px; }
.sv-list-acts { display:flex; gap:5px; }
.sv-list-empty { text-align:center; padding:40px; color:#94a3b8; font-size:13px; }
.sv-geo-chip { font-size:12px; background:#f5f3ff; color:#7c3aed; padding:2px 8px; border-radius:6px; }
.sv-status-chip { font-size:11.5px; font-weight:600; padding:3px 10px; border-radius:20px; }
.sv-status-chip.on  { background:#f0fdf4; color:#16a34a; }
.sv-status-chip.off { background:#f8fafc; color:#94a3b8; }

/* DETAIL PANEL */
.sv-detail { background:#fff; border:1px solid #e2e8f0; border-radius:20px; overflow:hidden; }
.sv-slide-enter-active,.sv-slide-leave-active { transition:.25s; }
.sv-slide-enter-from,.sv-slide-leave-to { opacity:0; transform:translateY(-8px); }

.sv-detail-hd { display:flex; align-items:center; gap:16px; padding:20px 24px 16px; border-bottom:1px solid #f1f5f9; flex-wrap:wrap; }
.sv-detail-av { position:relative; width:52px; height:52px; border-radius:15px; color:#fff; font-size:20px; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-detail-info { flex:1; min-width:0; }
.sv-detail-name { font-size:18px; font-weight:900; color:#1e293b; margin:0 0 7px; }
.sv-detail-chips { display:flex; gap:7px; flex-wrap:wrap; }
.sv-chip { display:inline-flex; align-items:center; gap:5px; font-size:12.5px; color:#64748b; background:#f1f5f9; padding:4px 10px; border-radius:20px; }
.sv-chip--plan { font-weight:700; }
.sv-detail-hd-right { display:flex; align-items:center; gap:8px; margin-left:auto; }
.sv-edit-btn { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 14px; border-radius:10px; border:1.5px solid #ede9fe; background:#fbfaff; color:#8b5cf6; font-size:13px; font-weight:600; cursor:pointer; transition:.15s; }
.sv-edit-btn:hover { background:#ede9fe; border-color:#ddd6fe; }
.sv-close-btn { width:36px; height:36px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:.15s; }
.sv-close-btn:hover { background:#fef2f2; color:#ef4444; border-color:#fecaca; }

.sv-dtabs { display:flex; padding:0 24px; border-bottom:1.5px solid #e2e8f0; overflow-x:auto; }
.sv-dtabs::-webkit-scrollbar { height:0; }
.sv-dtab { display:inline-flex; align-items:center; gap:6px; padding:12px 16px; border:none; background:none; font-size:13px; font-weight:500; color:var(--seg-ink); cursor:pointer; border-bottom:2.5px solid transparent; margin-bottom:-1.5px; transition:.14s; white-space:nowrap; flex-shrink:0; }
.sv-dtab:hover:not(.sv-dtab--on) { color:var(--seg-ink-h); }
.sv-dtab--on { color:var(--tab-on-ink); border-bottom-color:var(--tab-line); font-weight:600; }
.sv-dtab-cnt { font-size:11px; background:#f1f5f9; color:#64748b; padding:1px 7px; border-radius:20px; }
.sv-dtab--on .sv-dtab-cnt { background:var(--cnt-on-bg); color:var(--chip-on-ink); }

.sv-tab-body { padding:20px 24px; display:flex; flex-direction:column; gap:16px; }
.sv-tab-toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.sv-tab-srch { display:flex; align-items:center; gap:8px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 12px; height:38px; flex:1; min-width:180px; transition:.14s; }
.sv-tab-srch:focus-within { border-color:#8b5cf6; background:#fff; }
.sv-tab-srch svg { color:#94a3b8; }
.sv-tab-srch-in { flex:1; border:none; outline:none; font-size:13.5px; color:#1e293b; background:transparent; }
.sv-tab-cnt { font-size:12px; color:#94a3b8; }

.sv-table-wrap { overflow-x:auto; border:1px solid #e2e8f0; border-radius:14px; }
.sv-table { width:100%; border-collapse:collapse; font-size:13.5px; white-space:nowrap; min-width:600px; }
.sv-table thead tr { background:#f8fafc; border-bottom:1.5px solid #e2e8f0; }
.sv-table th { padding:10px 14px; text-align:left; font-size:10.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.04em; }
.sv-table td { padding:0 14px; height:50px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
.sv-tbl-row:last-child td { border-bottom:none; }
.sv-tbl-row:hover td { background:#f8fafc; }
.sv-td-i { color:#cbd5e1; font-size:12px; width:36px; }
.sv-mj-cell { display:flex; align-items:center; gap:10px; }
.sv-mj-av { width:32px; height:32px; border-radius:9px; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-mj-name { font-size:13.5px; font-weight:600; color:#1e293b; }
.sv-mj-addr { font-size:11.5px; color:#94a3b8; }
.sv-sinf-badge { display:inline-flex; align-items:center; justify-content:center; min-width:26px; height:26px; padding:0 7px; border-radius:7px; font-size:12px; font-weight:900; border:1.5px solid; }
.sv-dash { color:#cbd5e1; }
.sv-days-row { display:flex; gap:3px; flex-wrap:wrap; }
.sv-bal { font-size:13px; font-weight:800; }
.sv-bal.pos { color:#10b981; }
.sv-bal.neg { color:#ef4444; }
.sv-bal.zero { color:#94a3b8; }
.sv-tbl-empty { text-align:center; padding:40px; color:#94a3b8; font-size:13px; }

/* MAP TAB */
.sv-tab-body--map { padding:0 !important; gap:0 !important; }

/* Top panel */
.mp-top { padding:16px 22px; display:flex; flex-direction:column; gap:14px; border-bottom:1px solid #f1f5f9; }

/* Stats strip */
.mp-stats { display:flex; align-items:center; gap:0; background:#f8fafc; border:1px solid #e8ecf8; border-radius:14px; padding:10px 16px; }
.mp-stat { display:flex; align-items:center; gap:10px; flex:1; }
.mp-stat-ic { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mp-stat-ic svg { flex-shrink:0; }
.mp-stat-val { font-size:15px; font-weight:900; color:#1e293b; }
.mp-stat-lbl { font-size:10.5px; color:#94a3b8; margin-top:1px; }
.mp-stat-div { width:1px; height:32px; background:#e2e8f0; margin:0 16px; flex-shrink:0; }

/* Controls row */
.mp-controls { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.mp-legend { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.mp-leg-item { display:flex; align-items:center; gap:5px; font-size:12px; color:#64748b; }
.mp-leg-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.mp-leg-line { width:20px; height:3px; border-radius:2px; display:block; }
.mp-leg-start { width:12px; height:12px; border-radius:50%; background:#8b5cf6; border:2px solid #fff; box-shadow:0 0 0 2px #8b5cf6; flex-shrink:0; display:block; }

.mp-btns { display:flex; align-items:center; gap:7px; }
.mp-btn { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 14px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; font-size:12.5px; font-weight:600; color:#475569; cursor:pointer; transition:.15s; white-space:nowrap; }
.mp-btn:hover { border-color:#ddd6fe; color:#8b5cf6; background:#f8f9ff; }
.mp-btn:disabled { opacity:.45; cursor:not-allowed; }
.mp-btn--primary { background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; border-color:transparent; box-shadow:0 3px 12px rgba(139,92,246,.28); }
.mp-btn--primary:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(139,92,246,.38); color:#fff; border-color:transparent; }
.mp-spin { width:13px; height:13px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:rot .6s linear infinite; flex-shrink:0; }

/* No location */
.mp-no-loc { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:40px; color:#94a3b8; }
.mp-no-loc-ic { width:64px; height:64px; border-radius:18px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#cbd5e1; }
.mp-no-loc-title { font-size:14px; font-weight:700; color:#64748b; }
.mp-no-loc-sub { font-size:12.5px; color:#94a3b8; text-align:center; }

/* Body: sidebar + map */
.mp-body { display:grid; grid-template-columns:280px 1fr; height:460px; overflow:hidden; }

/* Sidebar */
.mp-sidebar { display:flex; flex-direction:column; border-right:1px solid #f1f5f9; overflow:hidden; }
.mp-sidebar-head { display:flex; align-items:center; justify-content:space-between; padding:12px 16px 10px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.mp-sidebar-title { font-size:12.5px; font-weight:800; color:#334155; }
.mp-sidebar-cnt { font-size:11px; background:#8b5cf6; color:#fff; padding:2px 8px; border-radius:20px; font-weight:700; }
.mp-stops { flex:1; overflow-y:auto; padding:10px 12px; display:flex; flex-direction:column; gap:0; }
.mp-stops::-webkit-scrollbar { width:4px; }
.mp-stops::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }

.mp-stop { display:flex; align-items:flex-start; gap:8px; padding:8px 6px; border-radius:10px; cursor:pointer; transition:.13s; position:relative; }
.mp-stop:hover { background:#f8fafc; }
.mp-stop--active { background:#ede9fe !important; }
.mp-stop--start { cursor:default; padding-bottom:0; }

.mp-stop-num { width:24px; height:24px; border-radius:8px; border:1.5px solid; font-size:11px; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; }
.mp-stop-num--start { border-color:#8b5cf6 !important; background:#8b5cf6 !important; color:#fff !important; }

.mp-stop-line { width:1.5px; position:absolute; left:17px; top:34px; bottom:-4px; border-radius:99px; }
.mp-stop-line--start { background:#8b5cf6 !important; opacity:.35; }

.mp-stop-info { flex:1; min-width:0; }
.mp-stop-name { font-size:12.5px; font-weight:700; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mp-stop-meta { display:flex; align-items:center; gap:5px; margin-top:2px; flex-wrap:wrap; }
.mp-sinf-tag { font-size:10px; font-weight:700; padding:1px 6px; border-radius:5px; }
.mp-stop-addr { font-size:10.5px; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px; }
.mp-stop-dist { display:flex; align-items:center; gap:3px; font-size:10.5px; color:#8b5cf6; font-weight:600; margin-top:2px; flex-wrap:wrap; }
.mp-stop-time { color:#94a3b8; font-weight:500; }
.mp-stop-focus { width:20px; height:20px; border:none; background:transparent; cursor:pointer; color:#94a3b8; display:flex; align-items:center; justify-content:center; border-radius:5px; transition:.12s; flex-shrink:0; padding:0; margin-top:2px; }
.mp-stop-focus:hover { background:#ede9fe; color:#8b5cf6; }
.mp-stops-empty { font-size:12.5px; color:#94a3b8; text-align:center; padding:20px 0; }

/* Map */
.mp-map-wrap { position:relative; overflow:hidden; background:#f0f4ff; }
.mp-map { width:100%; height:100%; }
.mp-map-hint { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:5px; font-size:11px; color:#64748b; background:rgba(255,255,255,.92); padding:5px 12px; border-radius:20px; box-shadow:0 2px 8px rgba(0,0,0,.1); pointer-events:none; white-space:nowrap; backdrop-filter:blur(4px); z-index:500; }

/* Loading overlay */
.mp-loading-overlay { position:absolute; inset:0; background:rgba(240,244,255,.82); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:800; }
.mp-loading-card { display:flex; align-items:center; gap:14px; background:#fff; padding:16px 22px; border-radius:16px; box-shadow:0 8px 32px rgba(139,92,246,.18); border:1px solid #ede9fe; }
.mp-loading-spinner { width:32px; height:32px; border:3px solid #ede9fe; border-top-color:#8b5cf6; border-radius:50%; animation:rot .7s linear infinite; flex-shrink:0; }
.mp-loading-title { font-size:13.5px; font-weight:800; color:#1e293b; }
.mp-loading-sub { font-size:11.5px; color:#94a3b8; margin-top:2px; }
.mp-fade-enter-active,.mp-fade-leave-active { transition:.25s; }
.mp-fade-enter-from,.mp-fade-leave-to { opacity:0; }

/* TASHRIF */
.sv-tashrif-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; }
.sv-tashrif-col { display:flex; flex-direction:column; gap:5px; }
.sv-tashrif-hd { display:flex; align-items:center; justify-content:space-between; padding:7px 8px; background:#f8fafc; border-radius:8px; border:1px solid #f1f5f9; }
.sv-tashrif-day { font-size:11.5px; font-weight:800; color:#334155; }
.sv-tashrif-cnt2 { font-size:11px; font-weight:800; padding:1px 6px; border-radius:20px; background:#e2e8f0; color:#94a3b8; }
.sv-tashrif-list { display:flex; flex-direction:column; gap:4px; }
.sv-tashrif-item { display:flex; align-items:center; gap:5px; padding:5px 6px; background:#f8fafc; border-radius:7px; }
.sv-tashrif-av { width:20px; height:20px; border-radius:5px; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-tashrif-name { font-size:11px; color:#334155; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }
.sv-tashrif-none { font-size:12px; color:#e2e8f0; text-align:center; padding:8px 0; }

/* KPI detail */
.sv-kpi-detail-row { display:grid; grid-template-columns:repeat(6,1fr); gap:10px; }
.sv-kpid { background:#f8fafc; border:1px solid #e8ecf8; border-radius:14px; padding:14px 12px; display:flex; flex-direction:column; align-items:center; gap:7px; text-align:center; }
.sv-kpid-ic { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
.sv-kpid-ic :deep(svg) { width:18px; height:18px; }
.sv-kpid-val { font-size:18px; font-weight:900; color:#1e293b; }
.sv-kpid-lbl { font-size:10.5px; color:#94a3b8; }

/* Plan card */
.sv-plan-card { background:#f8fafc; border:1px solid #e8ecf8; border-radius:16px; padding:18px; }
.sv-plan-card-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.sv-plan-card-title { font-size:14px; font-weight:800; color:#1e293b; }
.sv-plan-detail-track { height:10px; background:#e2e8f0; border-radius:99px; overflow:hidden; margin-bottom:12px; }
.sv-plan-detail-fill { height:100%; border-radius:99px; transition:width .6s ease; }
.sv-plan-card-nums { display:flex; justify-content:space-between; }
.sv-plan-num-val { font-size:16px; font-weight:900; color:#1e293b; }
.sv-plan-num-lbl { font-size:11px; color:#94a3b8; margin-top:2px; }
.sv-plan-extra { display:flex; align-items:center; gap:12px; margin-top:14px; padding-top:14px; border-top:1px solid #f1f5f9; }
.sv-pe-item { display:flex; align-items:center; gap:8px; flex:1; }
.sv-pe-item svg { flex-shrink:0; }
.sv-pe-val { font-size:14px; font-weight:800; color:#1e293b; }
.sv-pe-lbl { font-size:10.5px; color:#94a3b8; margin-top:1px; }
.sv-pe-div { width:1px; height:30px; background:#e2e8f0; flex-shrink:0; }

/* Activity */
.sv-act-card { background:#f8fafc; border:1px solid #e8ecf8; border-radius:16px; padding:18px; }
.sv-act-title { font-size:13.5px; font-weight:800; color:#1e293b; margin-bottom:14px; }
.sv-act-bars { display:flex; align-items:flex-end; gap:10px; height:90px; }
.sv-act-col { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; height:100%; }
.sv-act-bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; }
.sv-act-bar { width:100%; border-radius:5px 5px 0 0; min-height:4px; transition:height .5s ease; }
.sv-act-day { font-size:10px; color:#94a3b8; }
.sv-act-cnt { font-size:11px; font-weight:800; color:#334155; }

/* Sinf */
.sv-sinf-card { background:#f8fafc; border:1px solid #e8ecf8; border-radius:16px; padding:18px; }
.sv-sinf-rows { display:flex; flex-direction:column; gap:10px; margin-top:6px; }
.sv-sinf-row { display:flex; align-items:center; gap:10px; }
.sv-sinf-track { flex:1; height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
.sv-sinf-fill { height:100%; border-radius:99px; transition:width .5s; }
.sv-sinf-cnt { font-size:12px; font-weight:700; color:#334155; width:36px; text-align:right; flex-shrink:0; }
.sv-sinf-pct { font-size:11.5px; color:#94a3b8; width:34px; text-align:right; flex-shrink:0; }

/* Rank */
.sv-rank-card { background:#f8fafc; border:1px solid #e8ecf8; border-radius:16px; padding:18px; }
.sv-rank-list { display:flex; flex-direction:column; gap:5px; margin-top:6px; }
.sv-rank-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:9px; transition:.13s; }
.sv-rank-row:hover { background:#f1f5f9; }
.sv-rank-row--on { background:#ede9fe !important; }
.sv-rank-pos { width:24px; height:24px; border-radius:7px; background:#f1f5f9; color:#64748b; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-rank-name { font-size:13px; font-weight:700; color:#1e293b; min-width:130px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sv-rank-bar { flex:1; height:6px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
.sv-rank-bar-fill { height:100%; border-radius:99px; transition:width .5s; }
.sv-rank-pct { font-size:12.5px; font-weight:800; width:42px; text-align:right; flex-shrink:0; }
.sv-rank-sum { font-size:11.5px; color:#64748b; width:64px; text-align:right; flex-shrink:0; }

/* MODAL */
.sv-overlay { position:fixed; inset:0; background:rgba(15,23,42,.55); display:flex; align-items:center; justify-content:center; z-index:999; backdrop-filter:blur(6px); padding:16px; }
.sv-modal { background:#fff; border-radius:24px; width:100%; max-width:720px; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 32px 80px rgba(0,0,0,.22); overflow:hidden; }
.sv-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:22px 28px 18px; border-bottom:1px solid #f1f5f9; }
.sv-modal-title { display:flex; align-items:center; gap:12px; font-size:17px; font-weight:900; color:#1e293b; }
.sv-modal-icon { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-modal-x { width:34px; height:34px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:.13s; }
.sv-modal-x:hover { background:#fef2f2; color:#ef4444; border-color:#fecaca; }

/* Step nav */
.fm-steps { display:flex; align-items:center; padding:16px 28px 0; gap:0; position:relative; }
.fm-step-line { position:absolute; top:50%; left:28px; right:28px; height:1.5px; background:#e2e8f0; z-index:0; transform:translateY(-50%); pointer-events:none; }
.fm-step { display:flex; align-items:center; gap:8px; flex:1; background:none; border:none; cursor:pointer; padding:10px 0; position:relative; z-index:1; transition:.15s; }
.fm-step:last-child { flex:0; }
.fm-step-num { width:28px; height:28px; border-radius:50%; border:2px solid #e2e8f0; background:#fff; font-size:12px; font-weight:800; color:#94a3b8; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:.2s; }
.fm-step--on .fm-step-num { border-color:#8b5cf6; background:#8b5cf6; color:#fff; box-shadow:0 0 0 4px rgba(139,92,246,.18); }
.fm-step--done .fm-step-num { border-color:#10b981; background:#10b981; color:#fff; }
.fm-step-lbl { font-size:12px; font-weight:600; color:#94a3b8; white-space:nowrap; transition:.15s; }
.fm-step--on .fm-step-lbl { color:#8b5cf6; font-weight:800; }
.fm-step--done .fm-step-lbl { color:#10b981; }

.sv-form-err { display:flex; align-items:center; gap:10px; margin:12px 28px 0; padding:12px 14px; background:#fef2f2; border:1.5px solid #fecaca; border-radius:12px; }
.sv-form-err-ic { width:32px; height:32px; border-radius:9px; background:rgba(239,68,68,.12); color:#ef4444; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sv-form-err-body { flex:1; min-width:0; }
.sv-form-err-title { font-size:12.5px; font-weight:800; color:#dc2626; }
.sv-form-err-msg { font-size:12px; color:#991b1b; margin-top:1px; line-height:1.4; }
.sv-form-err-x { width:22px; height:22px; border:none; background:transparent; cursor:pointer; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#ef4444; opacity:.6; transition:.13s; flex-shrink:0; padding:0; }
.sv-form-err-x:hover { opacity:1; background:rgba(239,68,68,.1); }
.ferr-enter-active,.ferr-leave-active { transition:.2s; }
.ferr-enter-from,.ferr-leave-to { opacity:0; transform:translateY(-6px); }

.sv-modal-body { flex:1; overflow-y:auto; padding:20px 28px 4px; }
.sv-modal-body::-webkit-scrollbar { width:5px; }
.sv-modal-body::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }

/* Panel */
.fm-panel { display:flex; flex-direction:column; gap:18px; }
.fm-panel-hero { display:flex; align-items:center; gap:14px; padding:14px 18px; background:linear-gradient(135deg,#f8faff,#f0f4ff); border-radius:16px; border:1px solid #e8ecf8; }
.fm-panel-hero-ic { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 14px rgba(0,0,0,.12); }
.fm-panel-hero-title { font-size:15px; font-weight:900; color:#1e293b; }
.fm-panel-hero-sub { font-size:12.5px; color:#64748b; margin-top:2px; }

.fm-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.fm-field { display:flex; flex-direction:column; gap:6px; }
.fm-field--full { grid-column:1/-1; }
.fm-label { font-size:12.5px; font-weight:700; color:#374151; }
.fm-req { color:#ef4444; }

.fm-input-wrap { position:relative; display:flex; align-items:center; }
.fm-input-ic { position:absolute; left:12px; color:#94a3b8; flex-shrink:0; pointer-events:none; }
.fm-input { width:100%; height:42px; padding:0 12px 0 36px; border:1.5px solid #e2e8f0; border-radius:11px; background:#fff; font-size:13.5px; color:#1e293b; outline:none; transition:.15s; box-sizing:border-box; }
.fm-input:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.12); background:#fbfaff; }
.fm-input-suffix { position:absolute; right:12px; font-size:13px; font-weight:700; color:#94a3b8; pointer-events:none; }

.fm-textarea-wrap { position:relative; }
.fm-textarea { width:100%; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:11px; background:#fff; font-size:13.5px; color:#1e293b; outline:none; transition:.15s; box-sizing:border-box; resize:vertical; font-family:inherit; line-height:1.5; }
.fm-textarea:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.12); }

.fm-plan-preview { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:#10b981; margin-top:2px; }

/* Hudud kartalar */
.fm-hudud-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:8px; }
.fm-hudud-card { position:relative; display:flex; align-items:center; gap:8px; padding:10px 12px; border:1.5px solid #e2e8f0; border-radius:11px; background:#fff; cursor:pointer; text-align:left; transition:.15s; font-size:13px; font-weight:600; color:#475569; }
.fm-hudud-card:hover { border-color:#ddd6fe; color:#8b5cf6; background:#f8f9ff; }
.fm-hudud-card--on { border-color:#8b5cf6; background:linear-gradient(135deg,#ede9fe,#ede9fe); color:#7c3aed; box-shadow:0 2px 10px rgba(139,92,246,.15); }
.fm-hudud-ic { width:28px; height:28px; border-radius:8px; background:rgba(139,92,246,.1); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.fm-hudud-name { flex:1; line-height:1.3; }
.fm-hudud-check { width:18px; height:18px; border-radius:50%; background:#8b5cf6; color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.fm-hudud-empty { font-size:13px; color:#94a3b8; padding:16px; text-align:center; grid-column:1/-1; }

/* Hafta kunlari */
.fm-week-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; }
.fm-week-card { position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; padding:14px 6px 12px; border:1.5px solid #e2e8f0; border-radius:14px; background:#fff; cursor:pointer; transition:.2s; }
.fm-week-card:hover { border-color:#fcd34d; background:#fffbeb; transform:translateY(-2px); box-shadow:0 4px 14px rgba(245,158,11,.12); }
.fm-week-card--on { border-color:#f59e0b; background:linear-gradient(135deg,#fef3c7,#fde68a); box-shadow:0 4px 16px rgba(245,158,11,.25); transform:translateY(-2px); }
.fm-week-short { font-size:16px; font-weight:900; color:#334155; transition:.15s; }
.fm-week-card--on .fm-week-short { color:#92400e; }
.fm-week-full { font-size:9.5px; font-weight:600; color:#94a3b8; text-align:center; line-height:1.2; }
.fm-week-card--on .fm-week-full { color:#b45309; }
.fm-week-check { position:absolute; top:6px; right:6px; width:16px; height:16px; border-radius:50%; background:#f59e0b; color:#fff; display:flex; align-items:center; justify-content:center; }

.fm-days-summary { display:flex; align-items:flex-start; gap:8px; padding:12px 16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; font-size:13px; color:#15803d; }
.fm-days-empty { display:flex; align-items:center; gap:8px; padding:12px 16px; background:#fffbeb; border:1px solid #fde68a; border-radius:12px; font-size:13px; color:#92400e; }

.fm-quick-days { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.fm-quick-lbl { font-size:12px; font-weight:600; color:#94a3b8; }
.fm-quick-btn { height:30px; padding:0 12px; border:1.5px solid #e2e8f0; border-radius:8px; background:#fff; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; transition:.13s; }
.fm-quick-btn:hover { border-color:#fcd34d; color:#92400e; background:#fffbeb; }
.fm-quick-btn--red { border-color:#fee2e2; color:#ef4444; }
.fm-quick-btn--red:hover { background:#fef2f2; border-color:#fecaca; }

/* Transport */
.fm-check-card { display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border:1.5px solid rgba(15,23,42,.1); border-radius:12px; cursor:pointer; transition:.15s; }
.fm-check-card--on { border-color:#f97316; background:rgba(249,115,22,.06); }
.fm-mobil-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.fm-hint { display:block; margin-top:6px; font-size:11.5px; color:#64748b; }
@media (max-width:600px) { .fm-mobil-row { grid-template-columns:1fr; } }
.fm-check-input { display:none; }
.fm-check-box { width:20px; height:20px; border-radius:6px; border:1.5px solid #cbd5e1; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; margin-top:2px; }
.fm-check-card--on .fm-check-box { background:#f97316; border-color:#f97316; }
.fm-check-txt { display:flex; flex-direction:column; gap:2px; font-size:13px; }
.fm-check-txt small { font-size:11.5px; color:#64748b; line-height:1.4; }
.fm-transport-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
.fm-tr-card { position:relative; display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px 8px 12px; border:1.5px solid #e2e8f0; border-radius:14px; background:#fff; cursor:pointer; transition:.2s; }
.fm-tr-card:hover { border-color:#ddd6fe; background:#f5f3ff; transform:translateY(-2px); box-shadow:0 4px 14px rgba(124,58,237,.1); }
.fm-tr-card--on { border-color:#7c3aed; background:linear-gradient(135deg,#f5f3ff,#ede9fe); box-shadow:0 4px 16px rgba(124,58,237,.2); transform:translateY(-2px); }
.fm-tr-icon { color:#64748b; transition:.15s; }
.fm-tr-card--on .fm-tr-icon { color:#6d28d9; }
.fm-tr-name { font-size:11.5px; font-weight:700; color:#475569; }
.fm-tr-card--on .fm-tr-name { color:#5b21b6; }
.fm-tr-check { position:absolute; top:6px; right:6px; width:16px; height:16px; border-radius:50%; background:#7c3aed; color:#fff; display:flex; align-items:center; justify-content:center; }

/* Modal footer */
.sv-modal-ft { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:18px 28px; border-top:1px solid #f1f5f9; }
.sv-btn-cancel { height:40px; padding:0 18px; border-radius:11px; border:1.5px solid #e2e8f0; background:#fff; font-size:13.5px; font-weight:600; color:#64748b; cursor:pointer; transition:.13s; }
.sv-btn-cancel:hover { border-color:#ddd6fe; color:#8b5cf6; background:#f8f9ff; }
.fm-footer-nav { display:flex; align-items:center; gap:8px; }
.fm-prev-btn { display:inline-flex; align-items:center; gap:5px; height:40px; padding:0 16px; border-radius:11px; border:1.5px solid #e2e8f0; background:#fff; font-size:13.5px; font-weight:600; color:#64748b; cursor:pointer; transition:.13s; }
.fm-prev-btn:hover { border-color:#ddd6fe; color:#8b5cf6; }
.fm-next-btn { display:inline-flex; align-items:center; gap:6px; height:40px; padding:0 20px; border-radius:11px; border:none; background:linear-gradient(135deg,#1e293b,#334155); color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(30,41,59,.25); transition:.15s; }
.fm-next-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(30,41,59,.35); }
.sv-btn-save { display:inline-flex; align-items:center; gap:7px; height:40px; padding:0 22px; border-radius:11px; border:none; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(139,92,246,.3); transition:.15s; }
.sv-btn-save:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(139,92,246,.42); }
.sv-btn-save:disabled { opacity:.6; cursor:not-allowed; transform:none; }
.sv-spin-sm { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:rot .6s linear infinite; flex-shrink:0; }

.mfade-enter-active,.mfade-leave-active { transition:.22s; }
.mfade-enter-from,.mfade-leave-to { opacity:0; }
.mfade-enter-from .sv-modal,.mfade-leave-to .sv-modal { transform:scale(.95) translateY(12px); }

@media(max-width:1200px) { .sv-kpi-row{grid-template-columns:repeat(3,1fr)} .sv-kpi-detail-row{grid-template-columns:repeat(3,1fr)} }
@media(max-width:900px)  { .sv-kpi-row{grid-template-columns:repeat(2,1fr)} .sv-agents-grid{grid-template-columns:1fr 1fr} .sv-tashrif-grid{grid-template-columns:repeat(4,1fr)} .fm-grid2{grid-template-columns:1fr} .fm-week-grid{grid-template-columns:repeat(4,1fr)} .fm-transport-grid{grid-template-columns:repeat(3,1fr)} .mp-body{grid-template-columns:220px 1fr} }
@media(max-width:700px)  { .mp-body{grid-template-columns:1fr;grid-template-rows:auto 320px} .mp-sidebar{border-right:none;border-bottom:1px solid #f1f5f9;max-height:200px} }
@media(max-width:620px)  { .sv-agents-grid{grid-template-columns:1fr} .sv-kpi-row{grid-template-columns:1fr 1fr} .sv-kpi-detail-row{grid-template-columns:1fr 1fr} .sv-tashrif-grid{grid-template-columns:repeat(3,1fr)} .sv-sort-group{display:none} .fm-week-grid{grid-template-columns:repeat(4,1fr)} .fm-transport-grid{grid-template-columns:repeat(2,1fr)} .fm-hudud-grid{grid-template-columns:repeat(2,1fr)} .fm-step-lbl{display:none} .mp-stats{flex-wrap:wrap;gap:8px} .mp-stat-div{display:none} }
</style>

<style>
/* Leaflet popup global override */
.mp-popup .leaflet-popup-content-wrapper {
  border-radius: 14px !important;
  box-shadow: 0 8px 28px rgba(0,0,0,.14) !important;
  padding: 0 !important;
  overflow: hidden;
}
.mp-popup .leaflet-popup-content {
  margin: 0 !important;
  padding: 14px !important;
}
.mp-popup .leaflet-popup-tip-container { display: none; }
.leaflet-control-zoom { border: none !important; box-shadow: 0 2px 10px rgba(0,0,0,.1) !important; }
.leaflet-control-zoom a {
  border-radius: 8px !important;
  border: 1.5px solid #e2e8f0 !important;
  color: #334155 !important;
  font-weight: 700 !important;
  width: 32px !important;
  height: 32px !important;
  line-height: 30px !important;
}
.leaflet-control-zoom a:hover { background: #ede9fe !important; color: #8b5cf6 !important; }

/* ══ REJA TAB ══════════════════════════════════════════════ */
.sv-reja-tab { padding: 0; display: flex; flex-direction: column; overflow: hidden; }

.sv-reja-loading {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 60px; color: #94a3b8; font-size: 13.5px;
}
.sv-reja-spin { animation: reja-rot .7s linear infinite; color: #8b5cf6; }
@keyframes reja-rot { to { transform: rotate(360deg) } }

.sv-reja-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 60px 20px; color: #94a3b8; text-align: center;
}
.sv-reja-empty svg { opacity: .2; }
.sv-reja-empty p   { font-size: 14px; font-weight: 700; color: #64748b; margin: 0; }
.sv-reja-empty span { font-size: 12.5px; }

.sv-reja-list { flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 16px; }
.sv-reja-list::-webkit-scrollbar { width: 4px; }
.sv-reja-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }

/* Sana group */
.sv-reja-group { display: flex; flex-direction: column; gap: 6px; }

.sv-reja-date-hd {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px; background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border: 1px solid #e2e8f0; border-radius: 10px;
  position: sticky; top: 0; z-index: 1;
}
.sv-reja-date-ic {
  width: 24px; height: 24px; border-radius: 7px; background: #8b5cf6;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.sv-reja-date-ic svg { stroke: #fff; }
.sv-reja-date-lbl  { font-size: 13px; font-weight: 800; color: #1e293b; flex: 1; }
.sv-reja-date-cnt  { font-size: 11.5px; font-weight: 600; color: #8b5cf6; background: rgba(139,92,246,.1); padding: 2px 8px; border-radius: 20px; }
.sv-reja-date-sum  { font-size: 12.5px; font-weight: 800; color: #10b981; }

/* Ariza items */
.sv-reja-items { display: flex; flex-direction: column; gap: 4px; padding-left: 8px; }

.sv-reja-item {
  display: flex; align-items: flex-start; gap: 10px;
  background: #fff; border: 1.5px solid #e8ecf8; border-radius: 12px;
  padding: 11px 14px; transition: .13s;
}
.sv-reja-item:hover { border-color: #ddd6fe; box-shadow: 0 2px 10px rgba(139,92,246,.07); }

.sv-reja-item-av {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: #fff; font-size: 13px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
}
.sv-reja-item-info { display: flex; flex-direction: column; gap: 2px; min-width: 100px; flex-shrink: 0; }
.sv-reja-mijoz { font-size: 13px; font-weight: 700; color: #1e293b; }
.sv-reja-meta  { font-size: 11px; color: #94a3b8; display: flex; gap: 4px; }
.sv-reja-raqam { color: #8b5cf6; font-weight: 600; }

/* Tovarlar */
.sv-reja-tovs { flex: 1; display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; min-width: 0; }
.sv-reja-tov  {
  display: flex; align-items: center; gap: 4px;
  background: #f8fafc; border: 1px solid #e2e8f0;
  padding: 3px 8px; border-radius: 6px;
}
.sv-reja-tname { font-size: 11.5px; color: #334155; font-weight: 500; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-reja-tqty  { font-size: 11px; font-weight: 700; color: #8b5cf6; background: rgba(139,92,246,.08); padding: 0 5px; border-radius: 4px; white-space: nowrap; }
.sv-reja-more  { font-size: 11px; color: #94a3b8; align-self: center; }

.sv-reja-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.sv-reja-sum  { font-size: 13px; font-weight: 800; color: #1e293b; }
.sv-reja-holat { font-size: 10.5px; font-weight: 700; color: #7c3aed; background: rgba(124,58,237,.1); padding: 2px 8px; border-radius: 20px; }
</style>
