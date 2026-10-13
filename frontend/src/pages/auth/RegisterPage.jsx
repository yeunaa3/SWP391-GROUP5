import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerAccount } from "../../services/authService.js";
import AuthShell from "../../components/AuthShell.jsx";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

const initial = { username: "", email: "", password: "", fullName: "", phoneNumber: "", accountType: "READER" };

export default function RegisterPage() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  function update(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  async function submit(event) {
    event.preventDefault(); setError("");
    const payload={...form,fullName:form.fullName.trim().replace(/\s+/g," "),email:form.email.trim().toLowerCase()};
    if(!/^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u.test(payload.fullName)) {setError("Họ tên chỉ được chứa chữ và khoảng trắng.");return;}
    if(!/^[A-Za-z0-9@]{3,50}$/.test(payload.username)) {setError("Username chỉ dùng chữ không dấu, số và @ (3–50 ký tự).");return;}
    if(!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(payload.email)) {setError("Email không đúng định dạng.");return;}
    if(payload.phoneNumber) {
      const phone=parsePhoneNumberFromString(payload.phoneNumber.startsWith("0")?payload.phoneNumber:"+"+payload.phoneNumber,"VN");
      if(!/^[0-9]{8,15}$/.test(payload.phoneNumber) || !phone?.isValid()) {setError("Số điện thoại không hợp lệ theo đầu số quốc gia. Ví dụ: 0901234567 hoặc 84901234567.");return;}
    }
    setSubmitting(true);
    try { await registerAccount(payload); navigate("/login", { replace: true }); }
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
          <label>Full name<input name="fullName" required maxLength="100" value={form.fullName} onChange={update} /><small>Chỉ nhập chữ (có dấu) và khoảng trắng.</small></label>
          <label>Username<input name="username" required minLength="3" maxLength="50" pattern="[A-Za-z0-9@]+" title="Chỉ dùng chữ không dấu, số và @" value={form.username} onChange={update} /></label>
          <label>Email<input name="email" type="email" required maxLength="254" value={form.email} onChange={update} /></label>
          <label>Phone number<input name="phoneNumber" type="tel" inputMode="numeric" maxLength="15" pattern="[0-9]{8,15}" value={form.phoneNumber} onChange={event=>setForm({...form,phoneNumber:event.target.value.replace(/[^0-9]/g,"")})} /><small>Việt Nam: 0901234567 hoặc 84901234567. Quốc tế: mã quốc gia + số, chỉ nhập chữ số.</small></label>
        </div>
        <label>Password<input name="password" type="password" required minLength="8" maxLength="72" value={form.password} onChange={update} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create account"}</button>
        <p className="form-footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
