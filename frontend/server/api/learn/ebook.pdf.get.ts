import { asc, inArray } from 'drizzle-orm'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Block } from '#shared/types/learn'

// "Download PDF" for the e-book, generated from the same content blocks the reader shows.

const A4: [number, number] = [595.28, 841.89]
const M = 56 // margin
const INK = rgb(0.114, 0.114, 0.122)
const MUTED = rgb(0.43, 0.43, 0.45)
const ACCENT = rgb(0, 0.443, 0.89)

export default defineEventHandler(async (event) => {
  // Material from the Django backend once it has some (see server/utils/django-learn.ts)
  if (await useDjangoLearning(event)) throw createError({ statusCode: 404, statusMessage: 'The PDF is not available yet' })
  await requireAccess(event)
  const db = await useDb()
  const chapters = await db.select().from(schema.ebookChapters).orderBy(asc(schema.ebookChapters.position))
  const codes = [...new Set(chapters.flatMap((c) => c.blocks.flatMap((b) => (b.type === 'signs' ? b.codes : []))))]
  const signs = codes.length ? await db.select().from(schema.signs).where(inArray(schema.signs.code, codes)) : []
  const signBy = new Map(signs.map((s) => [s.code, s]))

  const pdf = await PDFDocument.create()
  pdf.setTitle('The Highway Code in plain English — 1Theory')
  pdf.setAuthor('1Theory')
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let page!: PDFPage
  let y = 0
  const newPage = () => {
    page = pdf.addPage(A4)
    y = A4[1] - M
  }
  const ensure = (h: number) => {
    if (y - h < M + 20) newPage()
  }

  /** Writes text with **bold** runs, wrapped to the content width. */
  const write = (text: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10.5
    const lineH = size * 1.45
    const maxW = A4[0] - M * 2 - (opts.indent ?? 0)
    const words: { w: string; f: PDFFont }[] = []
    text
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/—/g, '-')
      .replace(/–/g, '-')
      .split(/(\*\*[^*]+\*\*)/)
      .forEach((part) => {
        const isBold = part.startsWith('**')
        const f = opts.font ?? (isBold ? bold : regular)
        part.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).forEach((w) => words.push({ w, f }))
      })
    let line: typeof words = []
    let width = 0
    const flush = () => {
      ensure(lineH)
      let x = M + (opts.indent ?? 0)
      for (const { w, f } of line) {
        page.drawText(w, { x, y: y - size, size, font: f, color: opts.color ?? INK })
        x += f.widthOfTextAtSize(w + ' ', size)
      }
      y -= lineH
      line = []
      width = 0
    }
    for (const word of words) {
      const ww = word.f.widthOfTextAtSize(word.w + ' ', size)
      if (width + ww > maxW && line.length) flush()
      line.push(word)
      width += ww
    }
    if (line.length) flush()
    y -= opts.gap ?? 6
  }

  // Cover
  newPage()
  page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: rgb(0, 0, 0) })
  page.drawRectangle({ x: M, y: A4[1] - M - 40, width: 40, height: 40, color: rgb(1, 1, 1) })
  page.drawText('L', { x: M + 12, y: A4[1] - M - 31, size: 26, font: bold, color: rgb(1, 0.23, 0.19) })
  page.drawText('The Highway Code', { x: M, y: 420, size: 40, font: bold, color: rgb(1, 1, 1) })
  page.drawText('in plain English', { x: M, y: 376, size: 40, font: bold, color: rgb(0.16, 0.59, 1) })
  page.drawText('A 1Theory study guide for the UK car theory test', { x: M, y: 340, size: 13, font: regular, color: rgb(0.63, 0.63, 0.65) })
  page.drawText('Demo project. Our own summary - not the official Highway Code.', { x: M, y: M, size: 9, font: regular, color: rgb(0.63, 0.63, 0.65) })

  // Contents
  newPage()
  write('Contents', { size: 24, font: bold, gap: 14 })
  chapters.forEach((c, i) => write(`${i + 1}.  ${c.title}`, { size: 12, gap: 4 }))

  for (const [i, chapter] of chapters.entries()) {
    newPage()
    write(`Chapter ${i + 1}`, { size: 11, font: bold, color: ACCENT, gap: 2 })
    write(chapter.title, { size: 24, font: bold, gap: 4 })
    write(chapter.summary, { size: 12, color: MUTED, gap: 16 })
    for (const block of chapter.blocks) renderBlock(block)
  }

  function renderBlock(b: Block) {
    switch (b.type) {
      case 'heading':
        y -= 6
        write(b.text, { size: 15, font: bold, gap: 4 })
        break
      case 'text':
        b.text.split(/\n\n+/).forEach((p) => write(p))
        break
      case 'keypoints':
        if (b.title) write(b.title, { size: 12, font: bold, gap: 4 })
        b.items.forEach((item) => {
          ensure(16)
          page.drawCircle({ x: M + 4, y: y - 6.5, size: 2, color: ACCENT })
          write(item, { indent: 14, gap: 3 })
        })
        y -= 6
        break
      case 'callout': {
        const top = y
        write(`${b.title ?? 'Note'}`, { size: 11, font: bold, color: ACCENT, indent: 12, gap: 2 })
        write(b.text, { indent: 12 })
        if (top - y < A4[1]) page.drawRectangle({ x: M, y: y + 2, width: 3, height: top - y - 4, color: ACCENT })
        y -= 4
        break
      }
      case 'signs':
        if (b.caption) write(b.caption, { size: 11, font: bold, gap: 4 })
        b.codes.forEach((code) => {
          const s = signBy.get(code)
          if (s) write(`**${s.name}** - ${s.meaning}`, { indent: 14, gap: 3 })
        })
        y -= 6
        break
      case 'figure':
        if (b.caption) write(b.caption, { color: MUTED })
        break
      default:
        break
    }
  }

  // Page numbers (skip cover)
  pdf.getPages().forEach((p, i) => {
    if (i === 0) return
    p.drawText(`1Theory  ·  ${i + 1}`, { x: A4[0] - M - 60, y: 28, size: 8.5, font: regular, color: MUTED })
  })

  const bytes = await pdf.save()
  setResponseHeaders(event, {
    'content-type': 'application/pdf',
    'content-disposition': 'attachment; filename="1theory-highway-code.pdf"',
    'cache-control': 'private, no-store'
  })
  return Buffer.from(bytes)
})
