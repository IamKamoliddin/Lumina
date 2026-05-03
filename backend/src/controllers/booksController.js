import { createBook, listBooks, updateBook } from '../services/booksService.js'
import { fetchGoogleBookFile } from '../integrations/googleBooksClient.js'
import { fetchGutenbergBookFile, fetchGutenbergBookText, searchGutenbergBooks } from '../integrations/gutenbergClient.js'
import { fetchArchiveBookFile, fetchArchiveBookText, searchInternetArchiveBooks } from '../integrations/internetArchiveClient.js'

export const getBooks = async (req, res) => {
  const books = await listBooks(req.user.id)
  res.json({ data: books })
}

export const postBook = async (req, res) => {
  const book = await createBook(req.user.id, req.validated.body)
  res.status(201).json({ data: book })
}

export const patchBook = async (req, res) => {
  const result = await updateBook(req.user.id, req.validated.params.id, req.validated.body)
  return res.json({ data: result.book, proactiveMessage: result.proactiveMessage })
}

export const getOpenBooks = async (req, res) => {
  try {
    const { q = 'subject:textbooks', startIndex = '0', maxResults = '20' } = req.query
    const query = String(q).replace(/^subject:/, '')
    const requestedMax = Math.min(Math.max(Number(maxResults) || 20, 1), 30)
    const [gutenbergResult, archiveResult] = await Promise.allSettled([
      searchGutenbergBooks({
        query,
        startIndex: Number(startIndex),
        maxResults: requestedMax,
      }),
      searchInternetArchiveBooks({
        query,
        startIndex: Number(startIndex),
        maxResults: requestedMax,
      }),
    ])
    const gutenbergBooks = gutenbergResult.status === 'fulfilled' ? gutenbergResult.value.books : []
    const archiveBooks = archiveResult.status === 'fulfilled' ? archiveResult.value.books : []
    const seen = new Set()
    const books = [...gutenbergBooks, ...archiveBooks].filter((book) => {
      const key = `${book.title} ${book.author}`.trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, requestedMax)

    if (books.length === 0 && query.toLowerCase() !== 'textbook') {
      const fallback = await searchGutenbergBooks({ query: 'textbook', maxResults: requestedMax })
      books.push(...fallback.books)
    }

    res.json({
      data: books,
      totalItems:
        (gutenbergResult.status === 'fulfilled' ? gutenbergResult.value.totalItems : 0) +
        (archiveResult.status === 'fulfilled' ? archiveResult.value.totalItems : 0),
    })
  } catch (error) {
    res.status(error.statusCode ?? 503).json({
      error: {
        code: error.code ?? 'OPEN_BOOKS_UNAVAILABLE',
        message: 'Open book search is temporarily unavailable.',
      },
    })
  }
}

export const getGoogleBookFile = async (req, res) => {
  try {
    const file = await fetchGoogleBookFile(req.params.id)

    res.removeHeader('X-Frame-Options')
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.send(file.buffer)
  } catch (error) {
    res.status(error.statusCode ?? 503).json({
      error: {
        code: error.code ?? 'GOOGLE_BOOK_FILE_UNAVAILABLE',
        message: error.message ?? 'Google Books file is temporarily unavailable.',
      },
    })
  }
}

export const getGutenbergBookFile = async (req, res) => {
  try {
    const file = await fetchGutenbergBookFile(req.params.id)

    res.removeHeader('X-Frame-Options')
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.send(file.buffer)
  } catch (error) {
    res.status(error.statusCode ?? 503).json({
      error: {
        code: error.code ?? 'GUTENBERG_BOOK_FILE_UNAVAILABLE',
        message: error.message ?? 'Project Gutenberg file is temporarily unavailable.',
      },
    })
  }
}

export const getGutenbergBookText = async (req, res) => {
  try {
    const book = await fetchGutenbergBookText(req.params.id)
    res.json({ data: book })
  } catch (error) {
    res.status(error.statusCode ?? 503).json({
      error: {
        code: error.code ?? 'GUTENBERG_TEXT_UNAVAILABLE',
        message: error.message ?? 'Project Gutenberg text is temporarily unavailable.',
      },
    })
  }
}

export const getArchiveBookFile = async (req, res) => {
  try {
    const file = await fetchArchiveBookFile(req.params.id)

    res.removeHeader('X-Frame-Options')
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.send(file.buffer)
  } catch (error) {
    res.status(error.statusCode ?? 503).json({
      error: {
        code: error.code ?? 'ARCHIVE_BOOK_FILE_UNAVAILABLE',
        message: error.message ?? 'Internet Archive file is temporarily unavailable.',
      },
    })
  }
}

export const getArchiveBookText = async (req, res) => {
  try {
    const book = await fetchArchiveBookText(req.params.id)
    res.json({ data: book })
  } catch (error) {
    res.status(error.statusCode ?? 503).json({
      error: {
        code: error.code ?? 'ARCHIVE_TEXT_UNAVAILABLE',
        message: error.message ?? 'Internet Archive text is temporarily unavailable.',
      },
    })
  }
}
