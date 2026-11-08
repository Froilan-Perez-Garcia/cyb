import { useState, type FormEvent } from 'react'
import { Tags } from 'lucide-react'
import { Disclosure } from '../../components/Disclosure'
import { useAddCategory, useCategories } from './api'

export function CategoryManager() {
  const categories = useCategories()
  const add = useAddCategory()
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
    <Disclosure
      title="Categorías"
      description="Marca como esenciales las que el plan nunca debe tocar."
      icon={Tags}
    >
      <div className="space-y-5">
        <ul className="flex flex-wrap gap-2">
          {categories.data?.map((category) => (
            <li
              key={category.id}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                category.essential
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border bg-raised text-muted'
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
            className="input w-auto min-w-0 flex-1"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="essential"
              className="h-4 w-4 accent-[rgb(var(--accent))]"
            />
            Esencial
          </label>
          <button disabled={add.isPending} className="btn btn-primary">
            Crear
          </button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
      </div>
    </Disclosure>
  )
}
