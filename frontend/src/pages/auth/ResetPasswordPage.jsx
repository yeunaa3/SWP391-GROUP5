import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/AuthShell.jsx";

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ password: "", confirmation: "" });
  const [message, setMessage] = useState("");
  function submit(event) { event.preventDefault(); setMessage(form.password === form.confirmation ? "Password passed local validation. The reset API is not connected yet." : "Passwords do not match."); }
  return <AuthShell code="AUTH-04" eyebrow="Account recovery" title="Set new password" description="Set a new password using a valid reset token."><form className="pulse-form" onSubmit={submit}><label>New password<input type="password" minLength="8" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>Confirm new password<input type="password" minLength="8" required value={form.confirmation} onChange={(event) => setForm({ ...form, confirmation: event.target.value })} /></label><p className="password-rule">Use 8–64 characters with letters, numbers and symbols.</p>{message && <p className="info-note" role="status">{message}</p>}<button type="submit">Reset password</button><p className="form-footer"><Link to="/forgot-password">Request a new link</Link></p></form></AuthShell>;
}
