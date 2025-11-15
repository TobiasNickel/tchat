// Ticross Registration API - Frontend Integration Examples
// JavaScript/TypeScript examples for common use cases

// ============================================
// 1. ANONYMOUS REGISTRATION
// ============================================

async function registerAnonymous(optionalName = null) {
  try {
    const response = await fetch('/api/auth.php/register-anonymous', {
      method: 'POST',
      credentials: 'include', // Important: include cookies
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: optionalName
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    console.log('Anonymous user created:', data.user);
    // User is now logged in, cookie set automatically
    return data.user;
  } catch (error) {
    console.error('Registration failed:', error);
    alert(error.message);
  }
}

// Usage:
// await registerAnonymous();
// await registerAnonymous("CustomName");


// ============================================
// 2. EMAIL REGISTRATION (New User)
// ============================================

async function registerWithEmail(email, password, name = null) {
  try {
    const response = await fetch('/api/auth.php/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific errors
      if (response.status === 409) {
        // Email already exists or pending
        throw new Error(data.error);
      }
      if (response.status === 400) {
        // Validation error (email format, password length)
        throw new Error(data.error);
      }
      throw new Error('Registration failed');
    }

    console.log('Registration successful!');
    console.log('Verification code:', data.message); // For dev/testing
    // In production, this code will only be in email
    
    return {
      userId: data.user_id,
      requiresVerification: data.requires_verification
    };
  } catch (error) {
    console.error('Registration error:', error);
    alert(error.message);
  }
}

// Usage:
// const result = await registerWithEmail('user@example.com', 'Password123', 'John Doe');


// ============================================
// 3. EMAIL VERIFICATION
// ============================================

async function verifyEmail(code, userId = null) {
  try {
    const body = { code };
    if (userId) {
      body.user_id = userId;
    }

    const response = await fetch('/api/auth.php/verify-email', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error(data.error); // Invalid/expired code, already verified
      }
      throw new Error('Verification failed');
    }

    console.log('Email verified!', data.user);
    // User is now logged in, cookie set
    return data.user;
  } catch (error) {
    console.error('Verification error:', error);
    alert(error.message);
  }
}

// Usage:
// await verifyEmail('ABC12345');
// await verifyEmail('ABC12345', userId);


// ============================================
// 4. RESEND VERIFICATION EMAIL
// ============================================

async function resendVerificationEmail(email) {
  try {
    const response = await fetch('/api/auth.php/resend-verification-email', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    console.log('Verification email sent!');
    alert('New verification code sent to your email');
    return true;
  } catch (error) {
    console.error('Resend error:', error);
    alert(error.message);
  }
}

// Usage:
// await resendVerificationEmail('user@example.com');


// ============================================
// 5. FORGOT PASSWORD
// ============================================

async function requestPasswordReset(email) {
  try {
    const response = await fetch('/api/auth.php/forgot-password', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    console.log('Password reset email sent');
    alert(data.message);
    return true;
  } catch (error) {
    console.error('Forgot password error:', error);
    alert(error.message);
  }
}

// Usage:
// await requestPasswordReset('user@example.com');


// ============================================
// 6. RESET PASSWORD
// ============================================

async function resetPassword(userId, code, newPassword) {
  try {
    // Validate password strength on frontend
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const response = await fetch('/api/auth.php/reset-password', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        code,
        password: newPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error(data.error); // Invalid/expired code
      }
      throw new Error('Password reset failed');
    }

    console.log('Password reset successful!');
    alert('Password has been reset. Please login with your new password.');
    return true;
  } catch (error) {
    console.error('Reset error:', error);
    alert(error.message);
  }
}

// Usage:
// await resetPassword(1, 'ABC12345', 'NewPassword456');


// ============================================
// 7. LOGIN (Existing User)
// ============================================

async function login(email, password) {
  try {
    const response = await fetch('/api/auth.php/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid email or password');
      }
      if (response.status === 403) {
        throw new Error(data.error); // Account blocked
      }
      throw new Error('Login failed');
    }

    console.log('Logged in as:', data.user);
    // Cookie is automatically set
    return data.user;
  } catch (error) {
    console.error('Login error:', error);
    alert(error.message);
  }
}

// Usage:
// await login('user@example.com', 'Password123');


// ============================================
// 8. GET CURRENT USER
// ============================================

async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth.php/current-user', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        return null; // Not logged in
      }
      throw new Error(data.error);
    }

    return data.user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Usage:
// const user = await getCurrentUser();
// if (user) {
//   console.log('Logged in as:', user.name, user.email);
// } else {
//   console.log('Not logged in');
// }


// ============================================
// 9. LOGOUT
// ============================================

async function logout() {
  try {
    const response = await fetch('/api/auth.php/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    console.log('Logged out');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    alert(error.message);
  }
}

// Usage:
// await logout();


// ============================================
// HELPER: Check Authentication Status
// ============================================

async function isLoggedIn() {
  const user = await getCurrentUser();
  return user !== null;
}

async function isEmailVerified() {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.email_verified === true;
}

// Usage:
// const loggedIn = await isLoggedIn();
// const verified = await isEmailVerified();


// ============================================
// COMPLETE FLOW EXAMPLE: Anonymous → Email → Verified
// ============================================

async function completeRegistrationFlow() {
  try {
    // Step 1: Register as anonymous user
    console.log('Step 1: Creating anonymous account...');
    const anonUser = await registerAnonymous('TestPlayer');
    console.log('Anonymous user created:', anonUser.id);

    // Step 2: Register email (while logged in as anonymous)
    console.log('Step 2: Registering email...');
    const registration = await registerWithEmail(
      'newuser@example.com',
      'SecurePassword123',
      'Test User'
    );
    console.log('Registration started, waiting for verification...');

    // Step 3: In real app, user would check email for code
    // For now, we'd get code from backend response (dev only)
    // const verificationCode = 'ABC12345'; // From email

    // Step 4: Verify email
    console.log('Step 4: Verifying email...');
    // const verifiedUser = await verifyEmail(verificationCode);
    // console.log('Email verified! User:', verifiedUser);

    return registration;
  } catch (error) {
    console.error('Flow failed:', error);
  }
}

// Usage:
// await completeRegistrationFlow();


// ============================================
// REACT COMPONENT EXAMPLES
// ============================================

/*

// Anonymous Login Button
function AnonymousLoginButton() {
  const handleClick = async () => {
    const user = await registerAnonymous();
    if (user) {
      navigateTo('/game');
    }
  };

  return <button onClick={handleClick}>Play Anonymously</button>;
}


// Email Registration Form
function EmailRegistrationForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await registerWithEmail(email, password);
      if (result) {
        navigateTo(`/verify-email?userId=${result.userId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (6+ chars)"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}


// Email Verification Code Input
function EmailVerificationForm({ userId }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await verifyEmail(code.toUpperCase(), userId);
      if (user) {
        navigateTo('/game');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    // Get email somehow (from user state or API)
    await resendVerificationEmail('user@example.com');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter 8-character code"
        maxLength="8"
        pattern="[A-Z0-9]{8}"
        required
      />
      <button type="submit" disabled={loading || code.length !== 8}>
        {loading ? 'Verifying...' : 'Verify'}
      </button>
      <button type="button" onClick={handleResend}>
        Resend Code
      </button>
    </form>
  );
}


// Protected Route (check authentication)
function ProtectedRoute({ children }) {
  const [loggedIn, setLoggedIn] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    setLoggedIn(user !== null);
  };

  if (loggedIn === null) return <LoadingSpinner />;
  if (!loggedIn) return <Navigate to="/login" />;
  return children;
}

*/


// ============================================
// ERROR HANDLING EXAMPLES
// ============================================

const ErrorMessages = {
  INVALID_EMAIL: 'Please enter a valid email address',
  WEAK_PASSWORD: 'Password must be at least 6 characters',
  EMAIL_TAKEN: 'Email already registered. Use password reset.',
  PENDING_VERIFICATION: 'Email verification already in progress. Please try again later.',
  INVALID_CODE: 'Invalid or expired verification code',
  ALREADY_VERIFIED: 'Email is already verified',
  ACCOUNT_BLOCKED: 'Your account has been blocked',
  INVALID_CREDENTIALS: 'Invalid email or password',
};

function getErrorMessage(response, defaultError) {
  const errors = {
    400: 'Invalid input. Please check your data.',
    401: 'Authentication failed. Please try again.',
    403: 'Access denied. Your account may be blocked.',
    404: 'Not found.',
    409: 'Conflict. Email may already be registered.',
    500: 'Server error. Please try again later.',
  };

  return errors[response.status] || defaultError;
}


// ============================================
// FORM VALIDATION HELPERS
// ============================================

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function validateVerificationCode(code) {
  return /^[A-Z0-9]{8}$/.test(code);
}

function validateRegistration(email, password, confirmPassword = null) {
  const errors = [];

  if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!validatePassword(password)) {
    errors.push('Password must be at least 6 characters');
  }

  if (confirmPassword && password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  return errors;
}


// ============================================
// API SERVICE CLASS (TypeScript Example)
// ============================================

/*

interface User {
  id: number;
  name: string;
  email: string | null;
  email_verified: boolean;
  avatar_data_url: string | null;
  created_at: string;
  registered_at: string | null;
}

class AuthService {
  private baseUrl: string = '/api/auth.php';

  async registerAnonymous(name?: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/register-anonymous`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error((await response.json()).error);
    }

    return (await response.json()).user;
  }

  async registerWithEmail(email: string, password: string, name?: string): Promise<{ userId: number }> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      throw new Error((await response.json()).error);
    }

    const data = await response.json();
    return { userId: data.user_id };
  }

  async verifyEmail(code: string, userId?: number): Promise<User> {
    const response = await fetch(`${this.baseUrl}/verify-email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, user_id: userId })
    });

    if (!response.ok) {
      throw new Error((await response.json()).error);
    }

    return (await response.json()).user;
  }

  async getCurrentUser(): Promise<User | null> {
    const response = await fetch(`${this.baseUrl}/current-user`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()).user;
  }

  async logout(): Promise<void> {
    await fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  }
}

*/
