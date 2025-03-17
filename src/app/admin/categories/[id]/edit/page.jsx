import { supabase } from '@/utils/supabase'
import CategoryForm from '@/components/CategoryForm'
import { notFound } from 'next/navigation'

export default async function EditCategoryPage({ params }) {
  const id = await params.id
  
  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !category) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Edit Category: {category.name}</h1>
      <CategoryForm category={category} isEditing={true} fromAdmin={true} />
    </div>
  )
} 