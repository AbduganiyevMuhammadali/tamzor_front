/* Endpoint bo'yicha validatsiya sxemalari — backend validatorlari bilan bir xil
 * (beckend: src/middleware/validators/*.js va controller ichidagi tekshiruvlar).
 * Backend qoidasi o'zgarsa FAQAT shu fayl yangilanadi; formalarda qoida yozilmaydi. */
import type { Qoida, Sxema } from './qoidalar'

const m = (nom: string, max: number, q: Partial<Qoida> = {}): Qoida => ({ tur: 'matn', nom, max, ...q })
const s = (nom: string, q: Partial<Qoida> = {}): Qoida => ({ tur: 'son', nom, ...q })
const t = (nom: string, qiymatlar: readonly (string | number)[], q: Partial<Qoida> = {}): Qoida => ({ tur: 'tanlov', nom, qiymatlar, ...q })
const sana = (nom: string, q: Partial<Qoida> = {}): Qoida => ({ tur: 'sana', nom, ...q })

/** Pul summalari uchun yuqori chegara (DECIMAL(18,2) ga sig'adi; nol sanab adashishdan himoya) */
export const SUMMA_MAKS = 999_999_999_999

export const TOLOV_TURI = ['naqt', 'optom', 'chaka'] as const
export const KASSA_TOLOV_USUL = ['naqt', 'karta', 'bank'] as const

/* POST /mijozlar, PATCH /mijozlar/:id */
export const mijoz: Sxema = {
  nomi:              m('Mijoz nomi', 150, { majburiy: true, min: 1 }),
  yuridik_nomi:      m('Yuridik nomi', 200),
  telefon:           m('Telefon', 20),
  telefon2:          m("Qo'shimcha telefon", 20),
  manzil:            m('Manzil', 255),
  mo_ljal:           m("Mo'ljal", 255),
  sinf:              t('Sinf', ['A', 'B', 'C', 'D']),
  narx_turi:         t('Narx turi', ['optom', 'chakana'], { nullYoq: true }),
  inn:               m('INN', 20),
  shartnoma_raqam:   m('Shartnoma raqami', 50),
  shartnoma_sana:    sana('Shartnoma sanasi'),
  hisob_raqam:       m('Hisob raqam', 30),
  bank:              m('Bank', 100),
  mfo:               m('MFO', 10),
  tashrif_kunlari:   m('Tashrif kunlari', 50),
  tashrif_chastota:  m('Tashrif chastotasi', 30),
  lat:               s('Kenglik', { min: -90, max: 90 }),
  lng:               s('Uzunlik', { min: -180, max: 180 }),
  kredit_limit:      s('Kredit limiti', { min: 0, max: SUMMA_MAKS }),
  tolov_muddati_kun: s("To'lov muddati (kun)", { butun: true, min: 1, max: 3650 }),
  boshlangich_balans: s("Boshlang'ich balans", { min: -SUMMA_MAKS, max: SUMMA_MAKS }),
  boshlangich_sana:  sana("Boshlang'ich sana"),
  boshlangich_izoh:  m("Boshlang'ich izoh", 255),
}

/* POST /tovar, PATCH /tovar/:id */
export const tovar: Sxema = {
  nomi:               m('Tovar nomi', 120, { majburiy: true, min: 1 }),
  turkum:             m('Turkum', 80),
  podkategoriya:      m('Podkategoriya', 80),
  savdo_yonalishi:    m("Savdo yo'nalishi", 80),
  shtrix_kod:         m('Shtrix kod', 30),
  hajm:               s('Hajm', { min: 0 }),
  ogirlik:            s("Og'irlik", { min: 0 }),
  blokdagi_soni:      s('Blokdagi soni', { butun: true, min: 1 }),
  qutidagi_bloklar:   s('Qutidagi bloklar', { butun: true, min: 1 }),
  olchov_birligi:     m("O'lchov birligi", 20),
  brend:              m('Brend', 80),
  ishlab_chiqaruvchi: m('Ishlab chiqaruvchi', 100),
  segment:            m('Segment', 40),
  guruh:              m('Guruh', 40),
  tavsif:             m('Tavsif', 2000),
  turi:               t('Turi', ['tovar', 'xom_ashyo'], { nullYoq: true }),
}

/* POST /yetkazuvchilar, PATCH /yetkazuvchilar/:id */
export const yetkazuvchi: Sxema = {
  ism:     m('Yetkazuvchi nomi', 120, { majburiy: true }),
  telefon: m('Telefon', 30),
  manzil:  m('Manzil', 255),
  izoh:    m('Izoh', 2000),
}
/* POST /yetkazuvchilar/:id/tolov */
export const yetkazuvchiTolov: Sxema = {
  summa:      s('Summa', { majburiy: true, min: 0.01, max: SUMMA_MAKS }),
  tolov_turi: t("To'lov turi", TOLOV_TURI, { majburiy: true, nullYoq: true }),
  izoh:       m('Izoh', 2000),
  sana:       sana('Sana'),
}

/* POST /dostavchilar, PATCH /dostavchilar/:id */
export const dostavchi: Sxema = {
  ism:           m('Ism', 120, { majburiy: true }),
  telefon:       m('Telefon', 30),
  transport:     m('Transport', 80),
  mashina_raqam: m('Mashina raqami', 30),
  izoh:          m('Izoh', 2000),
  login:         m('Login', 50),
  parol:         m('Parol', 100, { min: 4 }),
}
/* POST /dostavchilar/:id/kassa-qabul */
export const dostavchiKassaQabul: Sxema = {
  summa: s('Summa', { majburiy: true, min: 0, max: SUMMA_MAKS }),
  sana:  sana('Sana'),
  izoh:  m('Izoh', 2000),
}

/* POST /agents, PATCH /agents/:id */
export const agent: Sxema = {
  fullname:          m('Ism', 100, { majburiy: true, min: 2, xabar: 'Ism majburiy' }),
  telefon:           m('Telefon', 20),
  passport:          m('Pasport', 20),
  tugilgan_sana:     sana("Tug'ilgan sana"),
  territoriya_id:    s('Hudud (viloyat)', { majburiy: true, min: 1, xabar: 'Hududni (viloyatni) tanlang' }),
  plan_summa:        s('Oylik plan summasi', { majburiy: true, min: 0, max: SUMMA_MAKS, xabar: 'Oylik plan summasi majburiy' }),
  bonus_foiz:        s('Bonus foizi', { min: 0, max: 100 }),
  kredit_limit:      s('Kredit limiti', { min: 0, max: SUMMA_MAKS }),
  max_chegirma:      s('Maksimal chegirma', { min: 0, max: 100 }),
  ish_boshlagan:     sana('Ish boshlagan sana'),
  boshlanish_manzil: m('Boshlanish manzili', 255),
  mashina_raqam:     m('Mashina raqami', 20),
  radius_km:         s('Radius (km)', { min: 0, max: 1000 }),
  login:             m('Login', 50),
  parol:             m('Parol', 100, { min: 4 }),
}

/* POST /users, PATCH /users/id/:id */
export const ROLLAR = ['Admin', 'User', 'Programmer'] as const
export const foydalanuvchi: Sxema = {
  username: m('Login', 25, { majburiy: true, min: 3 }),
  fullname: m("To'liq ism", 50, { majburiy: true, min: 3 }),
  role:     t('Rol', ROLLAR, { majburiy: true, nullYoq: true }),
  password: m('Parol', 100, { min: 3 }),
}
/* POST /users/login */
export const login: Sxema = {
  username: m('Login', 100, { majburiy: true }),
  password: m('Parol', 100, { majburiy: true }),
}

/* POST /narx-ruyxatlar, PATCH /narx-ruyxatlar/:id */
export const narxRuyxat: Sxema = {
  nomi: m("Ro'yxat nomi", 100, { majburiy: true, min: 1 }),
  izoh: m('Izoh', 255),
}

/* POST /prixod, PATCH /prixod/:id — sarlavha maydonlari (qatorlar formada alohida tekshiriladi) */
export const prixod: Sxema = {
  yetkazuvchi:       m('Yetkazuvchi', 120),
  tolov_turi:        t("To'lov turi", TOLOV_TURI),
  tolangan_summa:    s("To'langan summa", { min: 0, max: SUMMA_MAKS }),
  ombor:             m('Ombor', 80),
  izoh:              m('Izoh', 2000),
  qoshimcha_xarajat: s("Qo'shimcha xarajat", { min: 0, max: SUMMA_MAKS }),
}

/* POST /arizalar, PATCH /arizalar/:id — sarlavha maydonlari */
export const ARIZA_QATOR_MAKS = 500
export const ariza: Sxema = {
  turi:           t('Hujjat turi', ['sotish', 'qaytarish', 'almashtirish'], { nullYoq: true }),
  mijoz_nomi:     m('Mijoz', 150),
  agent_nomi:     m('Agent', 100),
  chegirma_foiz:  s('Chegirma (%)', { min: 0, max: 100 }),
  chegirma_summa: s('Chegirma summasi', { min: 0, max: SUMMA_MAKS }),
  bonus_summa:    s('Bonus summasi', { min: 0, max: SUMMA_MAKS }),
  tolov_turi:     m("To'lov turi", 30),
  ombor:          m('Ombor', 80),
  ekspeditor:     m('Ekspeditor', 100),
  jonatish_sana:  sana("Jo'natish sanasi"),
  izoh:           m('Izoh', 2000),
}

/* POST /kassa */
export const kassa: Sxema = {
  tur:        t('Tur', ['kirim', 'chiqim'], { majburiy: true, nullYoq: true }),
  kategoriya: m('Kategoriya', 100, { majburiy: true, xabar: 'Kategoriya kerak' }),
  summa:      s('Summa', { majburiy: true, musbat: true, max: SUMMA_MAKS }),
  tolov_usul: t("To'lov usuli", KASSA_TOLOV_USUL),
  izoh:       m('Izoh', 255),
}

/* POST /avtolavka/sotuv — sarlavha (qatorlar formada tekshiriladi) */
export const avtolavkaSotuv: Sxema = {
  mijoz_id: s('Mijoz', { majburiy: true, xabar: 'Mijozni tanlang' }),
  sana:     sana('Sotuv sanasi', { majburiy: true }),
  naqd:     s('Naqd summa', { min: 0, max: SUMMA_MAKS }),
  izoh:     m('Izoh', 255),
}

/* POST/PATCH /mijozlar/territoriya va /mijozlar/kategoriya */
export const hudud: Sxema = { nomi: m('Hudud nomi', 100, { majburiy: true, min: 1 }) }
export const mijozKategoriya: Sxema = { nomi: m('Kategoriya nomi', 100, { majburiy: true, min: 1 }) }

/* POST /xarajatlar (multipart) va toifalar */
export const xarajat: Sxema = {
  summa: s('Summa', { majburiy: true, musbat: true, max: SUMMA_MAKS }),
  sana:  sana('Sana'),
  izoh:  m('Izoh', 255),
}
export const xarajatToifa: Sxema = { nomi: m('Toifa nomi', 100, { majburiy: true, xabar: 'Toifa nomi kiritilmagan' }) }

/* POST /uchinchi-shaxslar, PATCH /uchinchi-shaxslar/:id, POST …/harakat */
export const uchinchiShaxs: Sxema = {
  ism:     m('Ism', 150, { majburiy: true, xabar: 'Ism kiritilmagan' }),
  telefon: m('Telefon', 30),
  izoh:    m('Izoh', 2000),
}
export const uchinchiHarakat: Sxema = {
  summa:  s('Summa', { majburiy: true, musbat: true, max: SUMMA_MAKS }),
  sana:   sana('Sana'),
  muddat: sana('Muddat sanasi'),
  izoh:   m('Izoh', 255),
}
