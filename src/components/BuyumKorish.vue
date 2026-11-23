<script setup>
/* Agent yoki mijozdagi buyumlar (backend §23) — faqat ko'rish.
   agentId berilsa: agent qo'lidagi va uning mijozlaridagi buyumlar (GET /buyumlar/agent/:id);
   mijozId berilsa: shu mijozdagi buyumlar va oxirgi harakatlar. Ruxsati yo'q yoki backend eski bo'lsa blok ko'rinmaydi. */
import { ref, watch, computed } from 'vue'
import { buyumApi } from '@/api/api'
import { authStore } from '@/stores/auth'

const props = defineProps({ agentId: { type: [Number, String], default: null }, mijozId: { type: [Number, String], default: null } })
const koradi = computed(() => [['avtolavka', 'view'], ['avtolavka', 'create'], ['ombor', 'view'], ['ombor', 'edit']].some(([m, a]) => authStore.hasPerm(m, a)))
const qolda = ref([]), mijozlarda = ref([]), buyumlar = ref([]), harakatlar = ref([]), yuklandi = ref(false), mavjud = ref(true)
const vaqt = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) }
const TUR = { mijozga: 'berildi', mijozdan: 'qaytarib olindi' }

async function yukla() {
  yuklandi.value = false; qolda.value = []; mijozlarda.value = []; buyumlar.value = []; harakatlar.value = []
  if (!koradi.value || (!props.agentId && !props.mijozId)) return
  try {
    if (props.agentId) { const d = await buyumApi.agent(props.agentId); qolda.value = d?.qolda || []; mijozlarda.value = d?.mijozlarda || [] }
    else {
      const [h, t] = await Promise.all([buyumApi.hisobotMijozlar({ mijoz_id: props.mijozId }), buyumApi.harakatlar({ mijoz_id: props.mijozId, limit: 5 })])
      buyumlar.value = h?.data?.[0]?.buyumlar || []; harakatlar.value = t?.data || []
    }
    mavjud.value = true
  } catch { mavjud.value = false }
  finally { yuklandi.value = true }
}
watch(() => [props.agentId, props.mijozId], yukla, { immediate: true })
</script>

<template>
  <div v-if="koradi && mavjud && yuklandi" class="bk">
    <div class="bk-hd"><b>Buyumlar</b><small>sotilmaydigan jihozlar</small>
      <RouterLink :to="{ path: '/buyumlar/harakatlar', query: agentId ? { agent_id: agentId } : { mijoz_id: mijozId } }" class="pl-link">Harakatlar tarixi</RouterLink>
    </div>
    <template v-if="agentId">
      <div class="bk-q"><span>Qo'lida:</span>
        <span v-for="b in qolda" :key="b.buyum_id" class="pl-bg pl-bg--pl">{{ b.nomi }} × {{ b.dona }}</span>
        <span v-if="!qolda.length" class="bk-yoq">buyum yo'q</span>
      </div>
      <div class="bk-q"><span>Mijozlarida:</span>
        <span v-for="b in mijozlarda" :key="b.mijoz_id + '-' + b.buyum_id" class="pl-bg">{{ b.mijoz_nomi }}: {{ b.nomi }} × {{ b.dona }}</span>
        <span v-if="!mijozlarda.length" class="bk-yoq">buyum yo'q</span>
      </div>
    </template>
    <template v-else>
      <div class="bk-q"><span>Mijozda:</span>
        <span v-for="b in buyumlar" :key="b.buyum_id" class="pl-bg pl-bg--pl" :title="b.oxirgi_sana ? 'Oxirgi harakat: ' + vaqt(b.oxirgi_sana) : ''">{{ b.nomi }} × {{ b.dona }}</span>
        <span v-if="!buyumlar.length" class="bk-yoq">buyum yo'q</span>
      </div>
      <div v-if="harakatlar.length" class="bk-tarix">
        <div v-for="h in harakatlar" :key="h.id">{{ vaqt(h.sana) }} · {{ h.agent?.nomi || '—' }} — {{ h.qatorlar.map(q => `${q.buyum_nomi} × ${q.dona}`).join(', ') }} {{ TUR[h.tur] || h.tur }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bk { display:flex; flex-direction:column; gap:8px; padding:12px 14px; border:1.5px solid #e6e3ef; border-radius:12px; background:#fff; font-size:13px; color:#334155; }
.bk-hd { display:flex; align-items:baseline; gap:8px; } .bk-hd b { font-size:13.5px; color:#0f172a; } .bk-hd small { color:#94a3b8; font-size:11.5px; } .bk-hd .pl-link { margin-left:auto; font-size:12.5px; }
.bk-q { display:flex; flex-wrap:wrap; align-items:center; gap:6px; } .bk-q > span:first-child { color:#64748b; min-width:86px; }
.bk-yoq { color:#94a3b8; }
.bk-tarix { display:flex; flex-direction:column; gap:3px; font-size:12px; color:#64748b; border-top:1px dashed #e6e3ef; padding-top:8px; }
.bk :deep(.pl-bg--pl) { background:#f5f3ff; color:#6d28d9; } .bk :deep(.pl-bg) { background:#f3f1f9; }
.bk :deep(.pl-link) { color:#6d28d9; }
</style>
