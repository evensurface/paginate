import { paginate } from "@evensurface/paginate-drizzle"
import { asc, gt } from "drizzle-orm"
import Link from "next/link"
import { db } from "@/db"
import { products } from "@/db/schema"

interface HomeProps {
  searchParams: Promise<{ page?: string; limit?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const { page, limit } = await searchParams

  const filter = gt(products.priceInCents, 10000)

  const { items, pagination } = await paginate({
    query: () => db.select().from(products).where(filter).orderBy(asc(products.id)),
    countQuery: db.$count(products, filter),
    page,
    limit,
  })

  return (
    <main className="container">
      <header className="page-header">
        <h1>Products</h1>
        <p>A simple example of server-side pagination with Drizzle ORM.</p>
      </header>

      <section className="table-container" aria-label="Products">
        <div className="table-header">
          <h2>All products</h2>
          <span>{pagination.total} products</span>
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
            Showing {pagination.firstItem}–{pagination.lastItem} of {pagination.total}
          </p>

          <nav className="pagination" aria-label="Pagination">
            {pagination.hasPreviousPage ? (
              <Link href={`/?page=${pagination.page - 1}`}>Previous</Link>
            ) : (
              <span className="disabled">Previous</span>
            )}

            <span className="page-indicator">
              {pagination.page} / {pagination.totalPages}
            </span>

            {pagination.hasNextPage ? (
              <Link href={`/?page=${pagination.page + 1}`}>Next</Link>
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
