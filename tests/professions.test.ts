import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_KEYS,
  PROFESSIONS,
  PROFESSION_CONFIG,
  documentInfo,
  expertApplyHref,
  matchHref,
  professionFromSlug,
  professionLabel,
  toProfession,
} from '@/lib/professions'

describe('meslek yapılandırması', () => {
  it('üç hizmet tanımlı', () => {
    expect(PROFESSIONS).toEqual(['psychologist', 'dietitian', 'trainer'])
  })

  it.each(PROFESSIONS)('%s için tüm metinler ve listeler dolu', (p) => {
    const c = PROFESSION_CONFIG[p]
    expect(c.label.length).toBeGreaterThan(2)
    expect(c.client.topics.length).toBeGreaterThanOrEqual(4)
    expect(c.client.topics).toContain('Diğer')
    expect(c.client.preferences).toContain('Fark etmez')
    expect(c.expert.areas.length).toBeGreaterThanOrEqual(4)
    expect(c.expert.credentials.length).toBeGreaterThanOrEqual(1)
    expect(c.serviceName.length).toBeGreaterThan(3)
    for (const key of DOCUMENT_KEYS) expect(c.documents[key].title.length).toBeGreaterThan(2)
    // Diploma her meslekte zorunlu
    expect(c.documents.diploma.required).toBe(true)
  })

  it('süpervizyon yalnızca psikologlarda açık', () => {
    expect(PROFESSION_CONFIG.psychologist.supervision).toBe(true)
    expect(PROFESSION_CONFIG.dietitian.supervision).toBe(false)
    expect(PROFESSION_CONFIG.trainer.supervision).toBe(false)
  })

  it('diyetisyen ve antrenörde sağlık ön sorusu var, psikologda yok', () => {
    expect(PROFESSION_CONFIG.psychologist.client.healthQuestion).toBeUndefined()
    expect(PROFESSION_CONFIG.dietitian.client.healthQuestion).toBeDefined()
    expect(PROFESSION_CONFIG.trainer.client.healthQuestion).toBeDefined()
  })

  it('antrenör salon ve ev için çalışabiliyor', () => {
    const t = PROFESSION_CONFIG.trainer
    expect(t.client.settingQuestion?.options).toEqual(expect.arrayContaining(['Salonda', 'Evde']))
    expect(t.client.topics.join(' ')).toMatch(/[Ss]alon/)
    expect(t.expert.areas.join(' ')).toMatch(/[Ss]alon/)
  })

  it('antrenörler diyet listesi hazırlamaz kuralı belgelerde yazıyor', () => {
    expect(PROFESSION_CONFIG.trainer.expert.credentials.join(' ')).toMatch(/diyet listesi hazırlamaz/i)
  })
})

describe('meslek dönüşümleri', () => {
  it('bilinmeyen değerler psikolog sayılır', () => {
    expect(toProfession(null)).toBe('psychologist')
    expect(toProfession('pdr')).toBe('psychologist')
    expect(toProfession('dietitian')).toBe('dietitian')
  })

  it('URL değerleri doğru çözülür', () => {
    expect(professionFromSlug('diyetisyen')).toBe('dietitian')
    expect(professionFromSlug('antrenor')).toBe('trainer')
    expect(professionFromSlug(['antrenor'])).toBe('trainer')
    expect(professionFromSlug('trainer')).toBe('trainer')
    expect(professionFromSlug(undefined)).toBe('psychologist')
    expect(professionFromSlug('<script>')).toBe('psychologist')
  })

  it('bağlantılar doğru üretilir', () => {
    expect(matchHref('psychologist')).toBe('/eslesme')
    expect(matchHref('dietitian')).toBe('/eslesme?meslek=diyetisyen')
    expect(matchHref('trainer', { konu: 'Salonda doğru program' })).toBe('/eslesme?meslek=antrenor&konu=Salonda+do%C4%9Fru+program')
    expect(expertApplyHref('psychologist')).toBe('/uzman-basvuru')
    expect(expertApplyHref('trainer')).toBe('/uzman-basvuru?meslek=antrenor')
  })

  it('etiketler', () => {
    expect(professionLabel('trainer')).toBe('Kişisel Antrenör')
    expect(professionLabel(undefined)).toBe('Psikolog')
  })

  it('belge bilgisi mesleğe göre değişir', () => {
    expect(documentInfo('trainer', 'license')?.required).toBe(false)
    expect(documentInfo('dietitian', 'license')?.required).toBe(true)
    expect(documentInfo('dietitian', 'diploma')?.title).toMatch(/Diyetetik/)
    expect(documentInfo('psychologist', 'yok')).toBeNull()
  })
})
