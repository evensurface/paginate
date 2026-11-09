import { paginate } from "@evensurface/paginate-drizzle"
import { asc, gt } from "drizzle-orm"
import Link from "next/link"
import { db } from "@/db"
import { products } from "@/db/schema"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>
}) {
  const { page, limit } = await searchParams

  const filter = gt(products.priceInCents, 10000)

  const { items, pagination: paginationMetadata } = await paginate({
    query: () => db.select().from(products).where(filter).orderBy(asc(products.id)),
    countQuery: db.$count(products, filter),
    page,
    limit,
  })

  /*
   * ITEMS TYPE                          INTERFACE TYPE
   *
   * const items: {                      interface PaginationMetadata {
   *   id: number;                         page: number;
   *   name: string;                       limit: number;
   *   priceInCents: number;               offset: number;
   * }[]                                   total: number;
   *                                       totalPages: number;
   *                                       hasNextPage: boolean;
   *                                       hasPreviousPage: boolean;
   *                                       firstItem: number;
   *                                       lastItem: number;
   *                                     }
   */

  return (
    <main className="container">
      <header className="page-header">
        <h1>Products</h1>
        <p>A simple example of server-side pagination with Drizzle ORM.</p>
      </header>

      <section className="table-container" aria-label="Products">
        <div className="table-header">
          <h2>All products</h2>
          <span>{paginationMetadata.total} products</span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col" className="price">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => (
                <tr key={product.id}>
                  <td className="id">{product.id}</td>
                  <td className="name">{product.name}</td>
                  <td className="price">${(product.priceInCents / 100).toFixed(2)}</td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="table-footer">
          <p>
            Showing {paginationMetadata.firstItem}–{paginationMetadata.lastItem} of{" "}
            {paginationMetadata.total}
          </p>

          <nav className="pagination" aria-label="Pagination">
            {paginationMetadata.hasPreviousPage ? (
              <Link href={`/?page=${paginationMetadata.page - 1}`}>Previous</Link>
            ) : (
              <span className="disabled">Previous</span>
            )}

            <span className="page-indicator">
              {paginationMetadata.page} / {paginationMetadata.totalPages}
            </span>

            {paginationMetadata.hasNextPage ? (
              <Link href={`/?page=${paginationMetadata.page + 1}`}>Next</Link>
            ) : (
              <span className="disabled">Next</span>
            )}
          </nav>
        </footer>
      </section>

      <footer className="page-bottom">
        <span>@evensurface/paginate-drizzle</span>

        <div className="footer-links">
          <a href="https://github.com/evensurface" target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
          <a
            href="https://www.npmjs.com/package/@evensurface/paginate-drizzle"
            target="_blank"
            rel="noopener noreferrer"
          >
            npm ↗
          </a>
        </div>
      </footer>
    </main>
  )
}
