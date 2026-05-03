import { AppError } from '../utils/appError.js'

const ARCHIVE_SEARCH_URL = 'https://archive.org/advancedsearch.php'
const ARCHIVE_METADATA_URL = 'https://archive.org/metadata'
const ARCHIVE_DOWNLOAD_URL = 'https://archive.org/download'
const DEFAULT_QUERY = 'textbooks'
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

const pickFirst = (value, fallback = '') => {
  if (Array.isArray(value)) return value.find(Boolean) ?? fallback
  return value ?? fallback
}

const buildDownloadUrl = (identifier, filename) =>
  `${ARCHIVE_DOWNLOAD_URL}/${encodeURIComponent(identifier)}/${filename
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`

const isPdfBuffer = (buffer) => buffer.subarray(0, 5).toString('utf8') === '%PDF-'
const isZipBuffer = (buffer) => buffer.subarray(0, 2).toString('utf8') === 'PK'

const isEncryptedFile = (file) => {
  const name = file.name?.toLowerCase() ?? ''
  const format = file.format?.toLowerCase() ?? ''
  return name.includes('encrypted') || name.includes('_lcp') || format.includes('encrypted')
}

const pickReadableFile = (files = []) => {
  const candidates = files.filter((file) => file.name && !isEncryptedFile(file))
  const textPdf = candidates.find((file) => file.name.endsWith('_text.pdf'))
  const pdf = candidates.find((file) => file.name.endsWith('.pdf') && file.format?.toLowerCase().includes('pdf'))
  const file = textPdf ?? pdf

  if (!file) return null

  return {
    filename: file.name,
    format: 'pdf',
  }
}

const pickTextFile = (files = []) => {
  const candidates = files.filter((file) => file.name && !isEncryptedFile(file))
  return (
    candidates.find((file) => file.name.endsWith('_djvu.txt')) ??
    candidates.find((file) => file.name.endsWith('.txt') && file.format?.toLowerCase().includes('text')) ??
    null
  )
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

const normalizeArchiveBook = async (doc) => {
  const metadata = await fetchArchiveMetadata(doc.identifier)
  const readableFile = pickReadableFile(metadata.files)

  if (!readableFile) return null

  const itemMetadata = metadata.metadata ?? {}
  const title = pickFirst(doc.title, pickFirst(itemMetadata.title, 'Untitled book'))
  const author = pickFirst(doc.creator, pickFirst(itemMetadata.creator, 'Unknown Author'))
  const pageCount = Number.parseInt(pickFirst(itemMetadata.imagecount, ''), 10)

  return {
    id: `archive-${doc.identifier}`,
    archive_id: doc.identifier,
    provider: 'Internet Archive',
    title,
    author,
    subject: pickFirst(doc.subject, 'General/AI'),
    status: 'Open Library',
    current_page: 0,
    total_pages: Number.isFinite(pageCount) && pageCount > 0 ? pageCount : 300,
    source_url: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
    reader_url: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
    download_url: buildDownloadUrl(doc.identifier, readableFile.filename),
    download_format: readableFile.format,
    cover_url: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
    description: pickFirst(doc.description, pickFirst(itemMetadata.description, '')),
    published_date: pickFirst(doc.date, pickFirst(itemMetadata.date, '')),
    is_open_access: true,
    is_archive: true,
    readable: true,
  }
}

export const fetchArchiveMetadata = async (identifier) => {
  const response = await fetchWithTimeout(`${ARCHIVE_METADATA_URL}/${encodeURIComponent(identifier)}`)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.error) {
    throw new AppError(404, 'ARCHIVE_BOOK_NOT_FOUND', 'Internet Archive book is unavailable.')
  }

  return payload
}

export const fetchArchiveBookFile = async (identifier) => {
  const metadata = await fetchArchiveMetadata(identifier)
  const file = pickReadableFile(metadata.files)

  if (!file) {
    throw new AppError(404, 'ARCHIVE_BOOK_FILE_UNAVAILABLE', 'This Internet Archive item does not provide a readable file.')
  }

  const response = await fetchWithTimeout(buildDownloadUrl(identifier, file.filename))

  if (!response.ok) {
    throw new AppError(503, 'ARCHIVE_BOOK_DOWNLOAD_FAILED', 'Internet Archive file is temporarily unavailable.')
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const isValidPdf = file.format === 'pdf' && isPdfBuffer(buffer)
  const isValidEpub = file.format === 'epub' && isZipBuffer(buffer)

  if (!isValidPdf && !isValidEpub) {
    throw new AppError(409, 'ARCHIVE_BOOK_FILE_INVALID', 'Internet Archive returned an unreadable file for this book.')
  }

  return {
    filename: file.filename,
    contentType: file.format === 'epub' ? 'application/epub+zip' : 'application/pdf',
    buffer,
  }
}

export const fetchArchiveBookText = async (identifier) => {
  const metadata = await fetchArchiveMetadata(identifier)
  const file = pickTextFile(metadata.files)

  if (!file) {
    throw new AppError(404, 'ARCHIVE_TEXT_UNAVAILABLE', 'This Internet Archive item does not provide readable text.')
  }

  const response = await fetchWithTimeout(buildDownloadUrl(identifier, file.name))

  if (!response.ok) {
    throw new AppError(503, 'ARCHIVE_TEXT_DOWNLOAD_FAILED', 'Internet Archive text is temporarily unavailable.')
  }

  const text = (await response.text()).replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim()
  const itemMetadata = metadata.metadata ?? {}

  return {
    title: pickFirst(itemMetadata.title, 'Untitled book'),
    author: pickFirst(itemMetadata.creator, 'Unknown Author'),
    text,
    pages: paginateText(text),
  }
}

export const searchInternetArchiveBooks = async ({ query = DEFAULT_QUERY, startIndex = 0, maxResults = 20 } = {}) => {
  const searchQuery = query.trim() || DEFAULT_QUERY
  const url = new URL(ARCHIVE_SEARCH_URL)
  url.searchParams.set('q', `${searchQuery} AND mediatype:texts`)
  url.searchParams.set('rows', String(Math.min(Math.max(maxResults, 1), 30)))
  url.searchParams.set('page', String(Math.floor(Math.max(startIndex, 0) / Math.max(maxResults, 1)) + 1))
  url.searchParams.set('output', 'json')
  url.searchParams.append('sort[]', 'downloads desc')
  ;['identifier', 'title', 'creator', 'description', 'subject', 'downloads', 'date'].forEach((field) => {
    url.searchParams.append('fl[]', field)
  })

  const response = await fetchWithTimeout(url)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.responseHeader?.status !== 0) {
    throw new AppError(503, 'ARCHIVE_SEARCH_UNAVAILABLE', 'Internet Archive search is temporarily unavailable.')
  }

  const docs = payload.response?.docs ?? []
  const books = (
    await Promise.all(
      docs.map(async (doc) => {
        try {
          return await normalizeArchiveBook(doc)
        } catch {
          return null
        }
      }),
    )
  ).filter(Boolean)

  return {
    totalItems: payload.response?.numFound ?? books.length,
    books,
  }
}
