import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: todos } = await supabase.from('todos').select()
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Hệ thống Quản lý Bán Hàng</h1>
        <p className="mb-4">Danh sách todos:</p>
        <ul className="list-disc list-inside">
          {todos?.map((todo) => (
            <li key={todo.id}>{JSON.stringify(todo)}</li>
          ))}
        </ul>
        {!todos?.length && <p>Không có dữ liệu todos</p>}
      </div>
    </div>
  );
}
