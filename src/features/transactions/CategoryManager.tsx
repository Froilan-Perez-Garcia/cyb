import { useState, type FormEvent } from 'react'
import { useAddCategory, useCategories } from './api'

export function CategoryManager() {
  const categories = useCategories()
  const add = useAddCategory()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name')).trim()
    if (!name) {
      setError('Escribe un nombre')
      return
    }
    setError('')
    add.mutate(
      { name, essential: data.get('essential') === 'on' },
      {
        onSuccess: () => form.reset(),
        onError: () => setError('Esa categoría ya existe'),
      },
    )
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(!open)} className="text-sm text-accent">
        {open ? 'Ocultar categorías' : 'Categorías'}
      </button>
      {open && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <ul className="flex flex-wrap gap-2 text-sm">
            {categories.data?.map((category) => (
              <li
                key={category.id}
                className={`rounded-full border px-3 py-1 ${
                  category.essential ? 'border-accent text-accent' : 'border-border text-muted'
                }`}
              >
                {category.name}
                {category.essential && ' · esencial'}
              </li>
            ))}
          </ul>
          <form onSubmit={submit} className="flex flex-wrap items-center gap-3">
            <input
              name="name"
              aria-label="Nombre de la categoría"
              maxLength={60}
              placeholder="Nueva categoría"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="essential" />
              Esencial
            </label>
            <button
              disabled={add.isPending}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-60"
            >
              Crear
            </button>
          </form>
          {error && <p className="text-sm text-expense">{error}</p>}
        </div>
      )}
    </div>
  )
}
