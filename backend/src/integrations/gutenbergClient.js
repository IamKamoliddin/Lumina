import { AppError } from '../utils/appError.js'

const GUTENDEX_URL = 'https://gutendex.com/books/'
const DEFAULT_QUERY = 'textbook'
const FETCH_TIMEOUT_MS = 12000

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const getAuthor = (authors = []) => authors.map((author) => author.name).filter(Boolean).join(', ') || 'Unknown Author'

const pickEpubUrl = (formats = {}) =>
  formats['application/epub+zip'] ||
  Object.entries(formats).find(([type, url]) => type.includes('epub') && typeof url === 'string')?.[1] ||
  ''

const pickTextUrls = (formats = {}, id = '') => [
  id ? `https://www.gutenberg.org/cache/epub/${encodeURIComponent(id)}/pg${encodeURIComponent(id)}.txt` : '',
  formats['text/plain; charset=utf-8'],
  formats['text/plain; charset=us-ascii'],
  formats['text/plain'],
  ...Object.entries(formats)
    .filter(([type, url]) => type.includes('text/plain') && typeof url === 'string')
    .map(([, url]) => url),
].filter(Boolean)

const isZipBuffer = (buffer) => buffer.subarray(0, 2).toString('utf8') === 'PK'

const stripGutenbergBoilerplate = (text) => {
  const startMatch = text.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*/i)
  const endMatch = text.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*/i)
  const start = startMatch ? startMatch.index + startMatch[0].length : 0
  const end = endMatch ? endMatch.index : text.length

  return text
    .slice(start, end)
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

const paginateText = (text, targetLength = 2600) => {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const pages = []
  let page = ''

  paragraphs.forEach((paragraph) => {
    const next = page ? `${page}\n\n${paragraph}` : paragraph
    if (next.length > targetLength && page) {
      pages.push(page)
      page = paragraph
      return
    }

    page = next
  })

  if (page) pages.push(page)
  return pages.length > 0 ? pages : [text]
}

const normalizeBook = (book) => {
  const epubUrl = pickEpubUrl(book.formats)

  if (!epubUrl) return null

  return {
    id: `gutenberg-${book.id}`,
    gutenberg_id: String(book.id),
    provider: 'Project Gutenberg',
    title: book.title ?? 'Untitled book',
    author: getAuthor(book.authors),
    subject: book.subjects?.[0] ?? book.bookshelves?.[0] ?? 'General/AI',
    status: 'Open Library',
    current_page: 0,
    total_pages: 300,
    source_url: `https://www.gutenberg.org/ebooks/${book.id}`,
    reader_url: `https://www.gutenberg.org/ebooks/${book.id}`,
    download_url: epubUrl,
    download_format: 'epub',
    cover_url: book.formats?.['image/jpeg'] ?? '',
    description: book.summaries?.[0] ?? '',
    published_date: '',
    is_open_access: true,
    is_gutenberg: true,
    readable: true,
  }
}

export const searchGutenbergBooks = async ({ query = DEFAULT_QUERY, startIndex = 0, maxResults = 20 } = {}) => {
  const searchQuery = query.trim() || DEFAULT_QUERY
  const pageSize = Math.min(Math.max(maxResults, 1), 32)
  const page = Math.floor(Math.max(startIndex, 0) / pageSize) + 1
  const url = new URL(GUTENDEX_URL)
  url.searchParams.set('search', searchQuery)
  url.searchParams.set('page', String(page))

  const response = await fetchWithTimeout(url)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new AppError(503, 'GUTENBERG_SEARCH_UNAVAILABLE', 'Project Gutenberg search is temporarily unavailable.')
  }

  return {
    totalItems: payload.count ?? 0,
    books: (payload.results ?? []).map(normalizeBook).filter(Boolean).slice(0, pageSize),
  }
}

export const fetchGutenbergBookFile = async (id) => {
  const response = await fetchWithTimeout(`${GUTENDEX_URL}${encodeURIComponent(id)}`)
  const book = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new AppError(404, 'GUTENBERG_BOOK_NOT_FOUND', 'Project Gutenberg book is unavailable.')
  }

  const epubUrl = pickEpubUrl(book.formats)

  if (!epubUrl) {
    throw new AppError(404, 'GUTENBERG_BOOK_FILE_UNAVAILABLE', 'This Project Gutenberg book does not provide a readable EPUB file.')
  }

  const fileResponse = await fetchWithTimeout(epubUrl)

  if (!fileResponse.ok) {
    throw new AppError(503, 'GUTENBERG_BOOK_DOWNLOAD_FAILED', 'Project Gutenberg file is temporarily unavailable.')
  }

  const buffer = Buffer.from(await fileResponse.arrayBuffer())

  if (!isZipBuffer(buffer)) {
    throw new AppError(409, 'GUTENBERG_BOOK_FILE_INVALID', 'Project Gutenberg returned an unreadable file for this book.')
  }

  return {
    filename: `${book.id}.epub`,
    contentType: 'application/epub+zip',
    buffer,
  }
}

export const fetchGutenbergBookText = async (id) => {
  const response = await fetchWithTimeout(`${GUTENDEX_URL}${encodeURIComponent(id)}`)
  const book = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new AppError(404, 'GUTENBERG_BOOK_NOT_FOUND', 'Project Gutenberg book is unavailable.')
  }

  const textUrls = pickTextUrls(book.formats, book.id ?? id)

  if (textUrls.length === 0) {
    throw new AppError(404, 'GUTENBERG_TEXT_UNAVAILABLE', 'This Project Gutenberg book does not provide readable text.')
  }

  let textResponse = null
  for (const textUrl of textUrls) {
    try {
      const candidate = await fetchWithTimeout(textUrl)
      if (candidate.ok) {
        textResponse = candidate
        break
      }
    } catch {
      textResponse = null
    }
  }

  if (!textResponse) {
    throw new AppError(503, 'GUTENBERG_TEXT_DOWNLOAD_FAILED', 'Project Gutenberg text is temporarily unavailable.')
  }

  const rawText = await textResponse.text()
  const text = stripGutenbergBoilerplate(rawText)

  return {
    title: book.title ?? 'Untitled book',
    author: getAuthor(book.authors),
    text,
    pages: paginateText(text),
  }
}
