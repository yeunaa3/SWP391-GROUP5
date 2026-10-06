import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerAccount } from "../../services/authService.js";
import AuthShell from "../../components/AuthShell.jsx";

const initial = { username: "", email: "", password: "", fullName: "", phoneNumber: "", accountType: "READER" };

export default function RegisterPage() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  function update(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  async function submit(event) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { await registerAccount(form); navigate("/login", { replace: true }); }
    catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  }

  return (
    <AuthShell code="AUTH-02" eyebrow="Reader and business access" title="Create account" description="Create a Reader or Business account using the selected account type.">
      <form className="pulse-form" onSubmit={submit}>
        <fieldset className="account-type"><legend>Account type</legend>
          <label><input type="radio" name="accountType" value="READER" checked={form.accountType === "READER"} onChange={update} /> Reader</label>
          <label><input type="radio" name="accountType" value="BUSINESS" checked={form.accountType === "BUSINESS"} onChange={update} /> Business</label>
        </fieldset>
        {form.accountType === "BUSINESS" && <p className="info-note">Legal company documents are submitted later in the Partnership Application, not during account registration.</p>}
        <div className="field-grid">
          <label>Full name<input name="fullName" required maxLength="100" value={form.fullName} onChange={update} /></label>
          <label>Username<input name="username" required minLength="3" maxLength="50" value={form.username} onChange={update} /></label>
          <label>Email<input name="email" type="email" required value={form.email} onChange={update} /></label>
          <label>Phone number<input name="phoneNumber" maxLength="30" value={form.phoneNumber} onChange={update} /></label>
        </div>
        <label>Password<input name="password" type="password" required minLength="8" maxLength="72" value={form.password} onChange={update} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create account"}</button>
        <p className="form-footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
