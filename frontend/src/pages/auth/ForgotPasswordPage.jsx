import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/AuthShell.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  function submit(event) { event.preventDefault(); setSent(true); }
  return <AuthShell code="AUTH-03" eyebrow="Account recovery" title="Forgot password" description="Request a time-limited password reset link by email."><form className="pulse-form" onSubmit={submit}><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>{sent && <p className="info-note" role="status">If the email matches an account, a reset link has been prepared. Email delivery is still using the local adapter.</p>}<button type="submit">Send reset link</button><p className="form-footer"><Link to="/login">← Back to login</Link></p></form></AuthShell>;
}
