import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes'
const DEFAULT_QUERY = 'subject:textbooks'

const pickImage = (imageLinks = {}) =>
  imageLinks.thumbnail ||
  imageLinks.smallThumbnail ||
  imageLinks.medium ||
  imageLinks.large ||
  ''

const preferHttps = (url = '') => url.replace(/^http:\/\//, 'https://')

const isPdfBuffer = (buffer) => buffer.subarray(0, 5).toString('utf8') === '%PDF-'
const isZipBuffer = (buffer) => buffer.subarray(0, 2).toString('utf8') === 'PK'
const looksLikeHtml = (buffer) => {
  const preview = buffer.subarray(0, 200).toString('utf8').trim().toLowerCase()
  return preview.startsWith('<!doctype') || preview.startsWith('<html') || preview.includes('<title>')
}

const normalizeVolume = (item) => {
  const info = item.volumeInfo ?? {}
  const access = item.accessInfo ?? {}
  const sale = item.saleInfo ?? {}
  const authors = Array.isArray(info.authors) && info.authors.length > 0 ? info.authors.join(', ') : 'Unknown Author'
  const totalPages = Number.isInteger(info.pageCount) && info.pageCount > 0 ? info.pageCount : 300
  const downloadableFile = access.pdf?.isAvailable
    ? { url: access.pdf.downloadLink, format: 'pdf' }
    : access.epub?.isAvailable
      ? { url: access.epub.downloadLink, format: 'epub' }
      : null
  const downloadUrl = downloadableFile?.url ?? ''
  const readerUrl = access.webReaderLink || info.previewLink || info.infoLink || `https://books.google.com/books?id=${item.id}`
  const viewability = access.viewability ?? 'UNKNOWN'

  return {
    id: `google-${item.id}`,
    google_books_id: item.id,
    title: info.title ?? 'Untitled book',
    author: authors,
    subject: info.categories?.[0] ?? 'General/AI',
    status: viewability === 'NO_PAGES' ? 'Preview only' : 'Google Books',
    current_page: 0,
    total_pages: totalPages,
    source_url: preferHttps(readerUrl),
    reader_url: preferHttps(readerUrl),
    download_url: preferHttps(downloadUrl),
    download_format: downloadableFile?.format ?? '',
    cover_url: preferHttps(pickImage(info.imageLinks)),
    description: info.description ?? '',
    published_date: info.publishedDate ?? '',
    is_open_access: true,
    is_google_books: true,
    embeddable: !!access.embeddable,
    public_domain: sale.saleability === 'FREE' || access.publicDomain === true,
    viewability,
    readable: Boolean(downloadableFile),
  }
}

const fetchGoogleVolume = async (id) => {
  const url = new URL(`${GOOGLE_BOOKS_URL}/${encodeURIComponent(id)}`)

  if (env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set('key', env.GOOGLE_BOOKS_API_KEY)
  }

  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new AppError(response.status === 404 ? 404 : 503, 'GOOGLE_BOOK_NOT_FOUND', 'Google Books volume is unavailable.')
  }

  return payload
}

export const fetchGoogleBookFile = async (id) => {
  const volume = await fetchGoogleVolume(id)
  const pdf = volume.accessInfo?.pdf
  const epub = volume.accessInfo?.epub
  const file = pdf?.isAvailable
    ? { url: pdf.downloadLink, format: 'pdf', contentType: 'application/pdf' }
    : epub?.isAvailable
      ? { url: epub.downloadLink, format: 'epub', contentType: 'application/epub+zip' }
      : null

  if (!file) {
    throw new AppError(404, 'GOOGLE_BOOK_FILE_UNAVAILABLE', 'This Google Books volume does not provide a readable file.')
  }

  const response = await fetch(preferHttps(file.url))

  if (!response.ok) {
    throw new AppError(503, 'GOOGLE_BOOK_DOWNLOAD_FAILED', 'Google Books file is temporarily unavailable.')
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const buffer = Buffer.from(await response.arrayBuffer())
  const isValidPdf = file.format === 'pdf' && (contentType.includes('pdf') || isPdfBuffer(buffer))
  const isValidEpub = file.format === 'epub' && (contentType.includes('epub') || isZipBuffer(buffer))

  if (looksLikeHtml(buffer) || (!isValidPdf && !isValidEpub)) {
    throw new AppError(
      409,
      'GOOGLE_BOOK_REQUIRES_VERIFICATION',
      'Google Books is asking for verification before allowing this download, so this book cannot be opened inside the app.',
    )
  }

  return {
    filename: `${volume.id}.${file.format}`,
    contentType: file.contentType,
    buffer,
  }
}

export const searchGoogleBooks = async ({ query = DEFAULT_QUERY, startIndex = 0, maxResults = 20 } = {}) => {
  const searchQuery = query.trim() || DEFAULT_QUERY
  const url = new URL(GOOGLE_BOOKS_URL)
  url.searchParams.set('q', searchQuery)
  url.searchParams.set('startIndex', String(startIndex))
  url.searchParams.set('maxResults', String(Math.min(Math.max(maxResults, 1), 40)))
  url.searchParams.set('printType', 'books')
  url.searchParams.set('projection', 'lite')
  url.searchParams.set('filter', 'free-ebooks')

  if (env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set('key', env.GOOGLE_BOOKS_API_KEY)
  }

  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error?.message ?? 'Google Books is temporarily unavailable.'
    throw new AppError(response.status === 429 ? 429 : 503, 'GOOGLE_BOOKS_UNAVAILABLE', message)
  }

  return {
    totalItems: payload.totalItems ?? 0,
    books: (payload.items ?? []).map(normalizeVolume).filter((book) => book.readable),
  }
}
