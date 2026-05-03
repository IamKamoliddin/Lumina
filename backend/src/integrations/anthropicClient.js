export const anthropicClient = {
  async chat({ context, message }) {
    return {
      content: `Context received. Prioritize exams first. Suggested reply for: ${message}\n\n${context.slice(0, 120)}...`,
      provider: 'mock-anthropic',
    }
  },
}
