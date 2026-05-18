import { StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { fetchBooks } from '@/api/lumina.api'
import { Card } from '@/components/ui/Card'
import { Screen } from '@/components/ui/Screen'
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/theme/colors'

export function LibraryScreen() {
  const { data, isLoading, error } = useQuery({ queryKey: ['books'], queryFn: fetchBooks })

  if (isLoading) return <LoadingView label="Loading library..." />
  if (error) return <ErrorView message="Unable to load your digital library." />

  const books = data?.data ?? []

  return (
    <Screen>
      <Text style={styles.title}>Library</Text>
      {books.length === 0 ? (
        <EmptyState title="No books yet" message="Add books from the web app and they will sync here." />
      ) : (
        books.map((book) => {
          const progress = book.total_pages ? Math.round(((book.current_page ?? 0) / book.total_pages) * 100) : 0

          return (
            <Card key={book.id}>
              <View style={styles.row}>
                <View style={styles.cover}>
                  <Text style={styles.coverText}>{progress}%</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.name}>{book.title}</Text>
                  <Text style={styles.meta}>{book.author || 'Unknown author'}</Text>
                  <Text style={styles.meta}>{book.status}</Text>
                </View>
              </View>
            </Card>
          )
        })
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  cover: {
    width: 58,
    height: 76,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    color: colors.primary,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
  },
})
