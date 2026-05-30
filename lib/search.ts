export function escapeSearchTerm(q: string) {
  return q.replaceAll('%', '\\%').replaceAll('_', '\\_')
}

export default escapeSearchTerm
