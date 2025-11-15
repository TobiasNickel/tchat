import { useState } from 'react';
import { login } from '../state/authState';
import './Login.css';
import { Link, navigateTo } from '../utils/PageReactRouter';
import { parseQueryString } from '@/utils/parseQueryString';
import { authSdk } from '@/sdk/auth.sdk';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigateTo('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to Chat</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <Link to="/auth/register">
          Register New Account
        </Link>
        <Link to="/auth/forgot-password">
          Forgot Password
        </Link>
        <Link to='/' style={{ float: 'right' }}>Play without Login</Link>
      </form>
    </div>
  );
}


export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call your registration API here
      await authSdk.register({ name, email, password });
      setResultMessage('Registration successful! Please check your email to verify your account.');
      // Automatically log in after registration
      await login(email, password);
      // navigateTo('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }
  return <div className="auth-container">
    <h2>Register New Account</h2>
    <form onSubmit={handleRegister} className="auth-form">
      <input
        type="text"
        placeholder="Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />
      <input
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      {error && <div className="auth-error">{error}</div>}
      <button type="submit" > /** disabled={loading || !!error || !name || !email || password.length<6} */
        {loading ? 'Registering...' : 'Register'}
      </button>
      {resultMessage && <p className='auth-result-message'>{resultMessage}</p>} 
      <Link to='/auth/login'>Back to Login</Link>
      <Link to='/' style={{ float: 'right' }}>Play</Link>
    </form>
  </div>;
}

export function VerifyEmail() {
  const { code, user_id } = parseQueryString();
  const [resultMessage, setResultMessage] = useState('');
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    try {
      if(!code || !user_id) {
        throw new Error('Missing code or user ID');
      }
      await authSdk.verifyEmail({ code, user_id });
      setResultMessage('Email verified successfully! Have fun playing!');
    } catch (error) {
      console.error('Email verification failed:', error);
    }
  }
  return <div className='auth-container'>
    <h1>Verify Email</h1>
    <form className="auth-form" onSubmit={handleVerify}>
      <p>Your verification code is: <strong>{code}</strong></p>
      <p>User ID: <strong>{user_id}</strong></p>
      <button type="submit">verify now</button>
      {resultMessage && <p className='auth-result-message'>{resultMessage}</p>}
      <Link to='/'>Play</Link>
    </form>
  </div>;
}



// user type email, sendForgotPassword request to server (send email with code)
// user can enter code, the code gets verified
// then user can enter new password twice, submit to server to reset password, including the same code.
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      await authSdk.sendForgotPasswordEmail({ email });
      setResultMessage('Reset email sent successfully. Please check your email and follow the instructions to reset your password.');
    } catch (error) {
      console.error('Forgot password failed:', error);
    }
  }
  return <div className='auth-container'>
    <h1>Forgot Password</h1>
    <form className="auth-form">
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button disabled={!email && email.includes('@')} onClick={handleForgotPassword}>Send Reset Email</button>
      {resultMessage && <p className='auth-result-message'>{resultMessage}</p>} 
      <Link to='/auth/login'>Back to Login</Link>
      <Link to='/' style={{ float: 'right' }}>Play</Link>
    </form>
  </div>
}

export function ResetPassword() {
  const { code, user_id } = parseQueryString();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    try {
      if(!code || !user_id) {
        throw new Error('Missing code or user ID');
      }
      if(password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      await authSdk.resetPassword({ code, user_id, new_password: password });
    } catch (error) {
      console.error('Password reset failed:', error);
    }
  }
  return <div className='auth-container'>
    <h1>Reset Password</h1>
    <form className="auth-form">
      <input type="text" placeholder="Verification Code" required />
      <input type="password" placeholder="New Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="password" placeholder="Confirm New Password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      <button disabled={!code || !user_id || !password || !confirmPassword || password !== confirmPassword} onClick={handleReset}>Reset Password</button>
      {resultMessage && <p className='auth-result-message'>{resultMessage}</p>} 
      <Link to='/auth/login'>Back to Login</Link>
      <Link to='/' style={{ float: 'right' }}>Play</Link>
    </form>
  </div>;
}