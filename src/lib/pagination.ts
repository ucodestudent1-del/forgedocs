export const MAX_PAGE_SIZE = 100
export const DEFAULT_PAGE_SIZE = 20

export function parsePagination(searchParams: URLSearchParams) {
  const rawPage = searchParams.get("page")
  const rawLimit = searchParams.get("limit")

  let page = 1
  if (rawPage !== null) {
    const parsed = parseInt(rawPage, 10)
    if (Number.isInteger(parsed) && parsed >= 1) page = parsed
  }

  let limit = DEFAULT_PAGE_SIZE
  if (rawLimit !== null) {
    const parsed = parseInt(rawLimit, 10)
    if (Number.isInteger(parsed) && parsed >= 1) limit = Math.min(parsed, MAX_PAGE_SIZE)
  }

  return { page, limit, offset: (page - 1) * limit }
}
