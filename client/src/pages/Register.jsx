import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/readings" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setErrors({});
    try {
      await register(form);
      navigate('/readings');
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
    } finally {
      setSubmitting(false);
    }
  }

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <form className="card auth-card" onSubmit={handleSubmit} noValidate>
      <h1>Create an account</h1>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      <label className="field">
        <span>Name</span>
        <input autoComplete="name" value={form.name} onChange={update('name')} />
        {errors.name && <small className="field-error">{errors.name}</small>}
      </label>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={form.email} onChange={update('email')} />
        {errors.email && <small className="field-error">{errors.email}</small>}
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" autoComplete="new-password" value={form.password} onChange={update('password')} />
        {errors.password && <small className="field-error">{errors.password}</small>}
      </label>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Sign up'}
      </button>
      <p className="muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
