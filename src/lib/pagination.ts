export const MAX_PAGE_SIZE = 100
export const DEFAULT_PAGE_SIZE = 20

export function parsePagination(searchParams: URLSearchParams) {
  let page = parseInt(searchParams.get("page") || "1")
  let limit = parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE))

  if (page < 1) page = 1
  if (limit < 1) limit = DEFAULT_PAGE_SIZE
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE

  return { page, limit, offset: (page - 1) * limit }
}
