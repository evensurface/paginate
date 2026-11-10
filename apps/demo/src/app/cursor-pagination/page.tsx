"use client"

import { useEffect, useState } from "react"

interface Product {
  id: number
  name: string
  priceInCents: number
}

interface ProductsPage {
  items: Product[]
  pagination: {
    nextCursor: string | null
  }
}

async function fetchProducts(cursor?: string): Promise<ProductsPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
  const response = await fetch(`/cursor-pagination/api${query}`)

  return response.json()
}

export default function CursorPagination() {
  const [items, setItems] = useState<Product[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void fetchProducts().then((page) => {
      setItems(page.items)
      setNextCursor(page.pagination.nextCursor)
      setIsLoading(false)
    })
  }, [])

  async function loadMore() {
    if (!nextCursor) return

    setIsLoading(true)
    const page = await fetchProducts(nextCursor)
    setItems((current) => [...current, ...page.items])
    setNextCursor(page.pagination.nextCursor)
    setIsLoading(false)
  }

  return (
    <main className="container">
      <header className="page-header">
        <h1>Cursor pagination</h1>
        <p>Load products five at a time with Drizzle ORM.</p>
      </header>

      <section className="table-container" aria-label="Products">
        <div className="table-header">
          <h2>All products</h2>
          <span>{items.length} products loaded</span>
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
            </tbody>
          </table>
        </div>

        <footer className="table-footer">
          <p>{items.length} products loaded</p>

          {nextCursor ? (
            <button
              type="button"
              className="pagination-button"
              onClick={loadMore}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load 5 more"}
            </button>
          ) : (
            !isLoading && <span className="disabled">All products loaded</span>
          )}
        </footer>
      </section>
    </main>
  )
}
