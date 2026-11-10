import { paginateCursor } from "@evensurface/paginate-drizzle"
import { db } from "@/db"
import { products } from "@/db/schema"

export async function GET(request: Request) {
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined

  const page = await paginateCursor({
    query: ({ cursorWhere, orderBy }) =>
      db
        .select()
        .from(products)
        .where(cursorWhere)
        .orderBy(...orderBy),
    orderBy: [
      {
        key: "id",
        column: products.id,
        direction: "asc",
        getValue: (product) => product.id,
      },
    ],
    cursor,
    limit: 5,
  })

  return Response.json(page)
}
