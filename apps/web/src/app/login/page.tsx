import LoginForm from './login-form';
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;
  const initialError=error==='account_exists'?'Email ?? c? t?i kho?n. H?y d?ng m?t kh?u.':error==='google_failed'?'Google login failed. Please retry.':'';
  return <LoginForm initialError={initialError}/>;
}
