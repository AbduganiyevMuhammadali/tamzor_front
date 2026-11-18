declare module '@/stores/notif' {
  import type { ComputedRef } from 'vue'

  interface NotifItem {
    id: number
    tur: string
    sarlavha: string
    matn: string
    sana: Date
    oqilgan: boolean
    havola: string | null
    rang: string
    countdown: number
    tayyor: boolean
    kalit?: string | null
  }
  interface PopupItem { id: number; tur: string; sarlavha: string; matn: string; havola: string | null; rang: string }

  export const notifStore: {
    state: { items: NotifItem[]; popup: PopupItem[] }
    oqilmagan: ComputedRef<number>
    add(opts: {
      tur?: string
      sarlavha: string
      matn: string
      havola?: string | null
      rang?: string
      countdown?: number
      sana?: string | Date | null
      jim?: boolean
      oqilgan?: boolean
      kalit?: string | null
    }): number
    popupYop(id: number): void
    prixodKeldi(opts: {
      prixodId: number | string
      yetkazuvchi?: string
      qatorSon: number
      summa: number
      ombor?: string
    }): number
    yangiZakaz(opts: {
      arizaId: number | string
      raqam?: string | null
      mijoz?: string
      agent?: string
      summa?: number
      manba?: string
      sana?: string | Date
    }): number
    oqish(id: number): void
    barchasiOqish(): void
    ochir(id: number): void
    hammasiniOchir(): void
  }
}
