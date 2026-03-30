// app/register/page.tsx
// Redirige al registro de admin (única ruta de registro activa)
import { redirect } from 'next/navigation'

export default function RegisterPage() {
  redirect('/register/admin')
}
