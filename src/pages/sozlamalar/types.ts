export interface Column<T = Record<string, unknown>> {
  key: keyof T & string
  label: string
  sortable?: boolean
  width?: string
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
}

export type SortDir = 'asc' | 'desc' | null

export interface SortState {
  key: string
  dir: SortDir
}

// ─── Domain models ──────────────────────────────────────────────────────────

export interface OlchovBirligi {
  id: string
  nomi: string
  qisqa: string
  asosiy: boolean
}

export interface TovarKategoriya {
  id: string
  nomi: string
  kod: string
  saralash: number
  olchov: string
  faol: boolean
}

export interface Podkategoriya {
  id: string
  nomi: string
  kategoriya: string
  saralash: number
  faol: boolean
}

export interface Guruh {
  id: string
  nomi: string
  kategoriya: string
  saralash: number
}

export interface Brend {
  id: string
  nomi: string
  ishlab_chiqaruvchi?: string
}

export interface IshlabChiqaruvchi {
  id: string
  nomi: string
  mamlakat?: string
}

export interface Segment {
  id: string
  nomi: string
  rang: string
}

export interface KategoriyaGuruh {
  id: string
  nomi: string
  kategoriyalar: string[]
}

export interface Tovar {
  id: string
  nomi: string
  turkum: string
  podkategoriya: string
  savdoYonalishi: string
  shtrixKod: string
  hajm: number
  ogirlik: number
  blokdagiSoni: number
  qutidagiBloklar: number
  olchovBirligi: string
  faol: boolean
  /** 'xom_ashyo' — sotilmaydi, "Xom ashyo ombori"da turadi, ishlab chiqarishga beriladi */
  turi: 'tovar' | 'xom_ashyo'
  /** Dillerga berish narxi (backend §24); null — belgilanmagan */
  dillerNarx?: number | null
}

export interface NarxTuri {
  id: string
  nomi: string
  tavsif: string
  foiz: number
  asosiy: boolean
}

export interface Narx {
  id: string
  tovar: string
  tovarNomi: string
  narxTuri: string
  narx: number
  valyuta: string
  faolDan: string
  faolGacha: string
}

export interface MijozKategoriya {
  id: string
  nomi: string
  rang: string
  chegirma: number
  kredit_limit: number
  tolov_muddati: number
}

export interface MijozTuri {
  id: string
  nomi: string
  tavsif: string
}

export interface Hudud {
  id: string
  nomi: string
  kod: string
  viloyat: string
  tuman: string
}

export interface RadEtishSababi {
  id: string
  nomi: string
  tur: 'buyurtma' | 'qaytarish'
  faol: boolean
}

export interface FotoHisobotKategoriya {
  id: string
  nomi: string
  majburiy: boolean
  faol: boolean
}

export interface InventarTuri {
  id: string
  nomi: string
  tavsif: string
}

export interface BonusTuri {
  id: string
  nomi: string
  hisoblash: 'foiz' | 'summa' | 'mahsulot'
  qiymat: number
  faol: boolean
}
