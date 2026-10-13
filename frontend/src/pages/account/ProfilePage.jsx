import { useEffect,useState } from "react";
import { apiRequest } from "../../services/apiClient.js";
import { useAuth } from "../../store/AuthContext.jsx";
import { usePreferences } from "../../store/PreferencesContext.jsx";

const passwords={currentPassword:"",newPassword:"",confirmNewPassword:""};
export default function ProfilePage(){
  const {refresh}=useAuth();const {t}=usePreferences();
  const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[confirm,setConfirm]=useState(false);
  useEffect(()=>{let alive=true;apiRequest("/api/account/profile").then(data=>{if(alive)setForm({...data,phoneNumber:(data.phoneNumber || "").replace(/^\+/,""),...passwords});}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  function edit(e){setForm({...form,[e.target.name]:e.target.value});setError("");setMessage("");setConfirm(false);}
  function review(e){e.preventDefault();setError("");setMessage("");
    if(!form.currentPassword){setError(t("Vui lòng nhập mật khẩu hiện tại.","Enter your current password."));return;}
    if(form.newPassword || form.confirmNewPassword){
      if(form.newPassword.length<8 || form.newPassword!==form.confirmNewPassword){setError(t("Mật khẩu mới cần ít nhất 8 ký tự và xác nhận trùng khớp.","New password must have at least 8 characters and match its confirmation."));return;}
      if(form.newPassword===form.currentPassword){setError(t("Mật khẩu mới phải khác mật khẩu hiện tại.","New password must differ from your current password."));return;}
    }
    setConfirm(true);
  }
  async function save(){if(busy)return;setBusy(true);setError("");try{
    const body={...form,fullName:form.fullName.trim().replace(/\s+/g," "),email:form.email.trim().toLowerCase()};
    const data=await apiRequest("/api/account/profile",{method:"PUT",body:JSON.stringify(body)});
    setForm({...data,phoneNumber:(data.phoneNumber || "").replace(/^\+/,""),...passwords});setConfirm(false);setMessage(t("Đã lưu thay đổi.","Changes saved."));await refresh();
  }catch(e){setError(e.message);setConfirm(false);}finally{setBusy(false);}}
  return <main className="page-content"><div className="page-heading"><div><p className="eyebrow">ACC-01 · ACCOUNT</p><h1>{t("Hồ sơ và bảo mật","Profile and Security")}</h1></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}
    {!form?<p>{t("Đang tải hồ sơ…","Loading profile…")}</p>:<form className="specification-form" onSubmit={review}>
      <div className="form-section-heading"><h2>{t("Thông tin cá nhân","Details")}</h2></div>
      <fieldset disabled={busy} style={{border:0,margin:0,padding:0}}><div className="specification-grid">
        {[["fullName",t("Họ tên","Full name"),"text",100],["email","Email","email",254],["phoneNumber",t("Số điện thoại","Phone number"),"tel",15],["currentPassword",t("Mật khẩu hiện tại","Current password"),"password",72],["newPassword",t("Mật khẩu mới","New password"),"password",72],["confirmNewPassword",t("Nhập lại mật khẩu mới","Confirm new password"),"password",72]].map(([name,label,type,max])=><label key={name}><span>{label}</span><input name={name} type={type} maxLength={max} value={form[name]} onChange={edit} required={["fullName","email","currentPassword"].includes(name)} autoComplete={type==="password"?(name==="currentPassword"?"current-password":"new-password"):undefined}/></label>)}
      </div><p className="info-note">{t("Nhập mật khẩu hiện tại để xác nhận thay đổi. Để trống cả hai trường mật khẩu mới nếu chỉ sửa thông tin cá nhân.","Enter your current password to authorize changes. Leave both new password fields blank to update profile details only.")}</p>
      <div className="form-actions"><button type="submit">{t("Lưu thay đổi","Save changes")}</button></div></fieldset>
    </form>}
    {confirm && <section className="dashboard-section" role="dialog" aria-modal="true" aria-labelledby="profile-confirm"><h2 id="profile-confirm">{t("Xác nhận lưu thay đổi?","Confirm changes?")}</h2><p>{t("Bạn có chắc muốn cập nhật hồ sơ và các thay đổi mật khẩu đã nhập?","Save your profile and any password changes entered?")}</p><div className="form-actions"><button disabled={busy} onClick={save}>{busy?t("Đang lưu…","Saving…"):t("Xác nhận lưu","Confirm save")}</button><button className="secondary-button" disabled={busy} onClick={()=>setConfirm(false)}>{t("Hủy","Cancel")}</button></div></section>}
  </main>;
}
