<script setup lang="ts">
/* YETKAZUVCHILAR (kreditorka) — kimga qancha qarzmiz, qanchasi to'langan,
   oxirgi marta qachon to'langan. */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import UstunGrafik from './kit/UstunGrafik.vue'
import { useYuklash, qisqa, fmt, foizFmt, kunOldin, sanaQisqa, csvYukla, IKON, RANG } from './kit/hisobot'

const router = useRouter()
const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.yetkazuvchilar())

const IZOH = [
  { nom: 'Olindi', matn: "Yetkazuvchidan qarzga olingan tovarlar summasi (yetkazuvchi hisobidagi \"qarz\" yozuvlari)." },
  { nom: "To'landi", matn: "Yetkazuvchiga qilingan to'lovlar." },
  { nom: 'Qarzimiz', matn: "Olindi − to'landi. Musbat bo'lsa — biz qarzmiz; manfiy bo'lsa — yetkazuvchida avansimiz bor." },
  { nom: 'Davr', matn: "Hozirgi holat ko'rsatiladi. Grafik — so'nggi 6 oy." },
]
const j = computed(() => d.value?.jami || {})
const qidir = ref('')
const rows = computed(() => {
  const q = qidir.value.trim().toLowerCase()
  return (d.value?.rows || []).filter((r: any) => !q || `${r.nomi} ${r.telefon || ''}`.toLowerCase().includes(q))
})
function eksport() {
  csvYukla('yetkazuvchilar', [
    { k: 'nomi', nom: 'Yetkazuvchi' }, { k: 'telefon', nom: 'Telefon' }, { k: 'olindi', nom: 'Olindi' }, { k: 'tolandi', nom: "To'landi" },
    { k: 'qarzimiz', nom: 'Qarzimiz' }, { k: 'avans', nom: 'Avans' }, { k: 'tolangan_foiz', nom: "To'langan %" }, { k: 'tolovsiz_kun', nom: "Oxirgi to'lovdan (kun)" },
  ], rows.value)
}
</script>

<template>
  <HisobotSahifa :ikon="IKON.zavod" nom="Yetkazuvchilar" savol="Yetkazuvchilarga qancha qarzmiz va qanchasini to'ladik"
    :davrli="false" :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">
    <template #amal>
      <input v-model="qidir" class="hs-inp" placeholder="Yetkazuvchi…"/>
      <button class="hs-btn hs-btn--s" :disabled="!d" @click="eksport"><svg viewBox="0 0 24 24" v-html="IKON.yuklab"/>Excel</button>
    </template>

    <div v-if="!d" class="hs-grid hs-grid--kpi"><div v-for="i in 4" :key="i" class="hs-skelet" style="height:104px"/></div>

    <template v-else>
      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Qarzimiz" :ikon="IKON.ogoh" :qiymat="j.qarzimiz" birlik="so'm" :ton="j.qarzimiz ? 'warn' : 'ok'" :izoh="`${j.qarzdor_soni} ta yetkazuvchiga`"/>
        <KpiKarta nom="Jami olindi" :ikon="IKON.kirim" :qiymat="j.olindi" birlik="so'm" :izoh="`${j.soni} ta yetkazuvchidan`"/>
        <KpiKarta nom="Jami to'landi" :ikon="IKON.hamyon" :qiymat="j.tolandi" birlik="so'm" ton="ok" :izoh="`Olinganning ${foizFmt(j.olindi ? j.tolandi / j.olindi * 100 : 0)} i`"/>
        <KpiKarta v-if="j.avans" nom="Avansimiz" :ikon="IKON.pul" :qiymat="j.avans" birlik="so'm" izoh="Oldindan to'langan" ton="neytral"/>
      </div>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.grafik"/></span>
          <div class="hs-kt"><h2>So'nggi 6 oy</h2><p>Olingan tovar va qilingan to'lovlar — to'lov ustuni pastroq bo'lsa, qarz o'sgan</p></div>
        </div>
        <div class="hs-karta-b">
          <UstunGrafik :data="d.oylik" guruh="oy" :balandlik="230"
            :seriyalar="[{ k: 'olindi', nom: 'Olindi', rang: RANG.brand }, { k: 'tolandi', nom: 'To\'landi', rang: RANG.ok }]"/>
        </div>
      </section>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.zavod"/></span>
          <div class="hs-kt"><h2>Yetkazuvchilar ro'yxati</h2><p>Qarz bo'yicha saralangan · bosing — yetkazuvchi kartasi ochiladi</p></div>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr><th>Yetkazuvchi</th><th class="r">Olindi</th><th class="r">To'landi</th><th>To'langan</th><th class="r">Qarzimiz</th><th class="r">Oxirgi kirim</th><th class="r">Oxirgi to'lov</th></tr></thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id" class="bos" @click="router.push(`/yetkazuvchilar/${r.id}`)">
                <td><div class="hs-nom"><b>{{ r.nomi }}</b><small>{{ r.telefon || '—' }} · {{ r.hujjat }} ta kirim</small></div></td>
                <td class="r">{{ fmt(r.olindi) }}</td>
                <td class="r">{{ fmt(r.tolandi) }}</td>
                <td><span class="hs-mini yk-mini"><i :style="{ width: Math.min(100, r.tolangan_foiz) + '%' }"/></span><span class="m">{{ foizFmt(r.tolangan_foiz) }}</span></td>
                <td class="r">
                  <b v-if="r.qarzimiz" class="hs-warn">{{ fmt(r.qarzimiz) }}</b>
                  <span v-else-if="r.avans" class="hs-ok">avans {{ qisqa(r.avans) }}</span>
                  <span v-else class="hs-mut">hisob yopiq</span>
                </td>
                <td class="r m">{{ sanaQisqa(r.oxirgi_kirim) }}</td>
                <td class="r"><span v-if="r.oxirgi_tolov">{{ kunOldin(r.tolovsiz_kun) }}</span><span v-else class="hs-err">to'lov yo'q</span></td>
              </tr>
              <tr v-if="!rows.length"><td colspan="7"><div class="hs-bosh">Yetkazuvchi topilmadi</div></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.yk-mini i { background:#059669; }
</style>
