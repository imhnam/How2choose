import LoginForm from './login-form';
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;
  const initialError=error==='account_exists'?'Email đã có tài khoản. Hãy đăng nhập bằng mật khẩu.':error==='google_failed'?'Đăng nhập Google chưa thành công. Vui lòng thử lại.':'';
  return <LoginForm initialError={initialError}/>;
}
