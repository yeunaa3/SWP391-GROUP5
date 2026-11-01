import { useEffect, useState } from "react";
import { apiRequest } from "../../services/apiClient.js";
import { useAuth } from "../../store/AuthContext.jsx";
import ModalShell from "../../components/ModalShell.jsx";
import "../../assets/iteration3-admin.css";

const statusNames={ACTIVE:"Hoạt động",INACTIVE:"Ngừng hoạt động",LOCKED:"Đã khóa"};
const capabilityNames={READER:"Đọc tin và quản lý tài khoản",SUBSCRIBER:"Không gian Premium (vẫn cần thuê bao còn hạn)",BUSINESS:"Không gian doanh nghiệp (vẫn kiểm tra hồ sơ/hợp đồng)",AD_MANAGER:"Xét duyệt quảng cáo",ADMINISTRATOR:"Quản trị hệ thống"};

/** CFG-02: tải dữ liệu thật, lọc/phân trang từ API; không sửa company hoặc mật khẩu từ màn này. */
export default function AccessManagementPage(){
  const {refresh}=useAuth();
  const [data,setData]=useState(null),[filters,setFilters]=useState({query:"",status:"",role:""}),[applied,setApplied]=useState({query:"",status:"",role:"",page:0});
  const [editing,setEditing]=useState(null),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  /** Không gửi yêu cầu tìm theo mỗi phím; chỉ áp dụng khi bấm tìm hoặc đổi trang. */
  async function load(){const result=await apiRequest(`/api/admin/access?${new URLSearchParams(applied)}`);setData(result);}
  useEffect(()=>{let alive=true;setError("");apiRequest(`/api/admin/access?${new URLSearchParams(applied)}`).then(result=>{if(alive)setData(result);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[applied]);
  function openUser(row){setError("");setMessage("");setConfirm(false);setEditing({kind:"user",id:row.id,label:row.username,status:row.status,roleIds:row.roleIds,version:row.version,reason:""});}
  function openRole(row){setError("");setMessage("");setConfirm(false);setEditing({kind:"role",id:row?.id,name:row?.name||"",description:row?.description||"",status:row?.status||"ACTIVE",permissions:row?.permissions||[],version:row?.version||0,builtIn:row?.builtIn||false,reason:""});}
  function toggle(field,value){setEditing(v=>({...v,[field]:v[field].includes(value)?v[field].filter(x=>x!==value):[...v[field],value]}));setConfirm(false);}
  /** Xác nhận chứa đúng thay đổi; server kiểm version/RBAC/admin cuối cùng trước khi ghi transaction. */
  async function save(){if(busy)return;setBusy(true);setError("");try{
    const {kind,id,...body}=editing;
    const path=kind==="user"?`/api/admin/access/users/${id}`:`/api/admin/access/roles${id?`/${id}`:""}`;
    await apiRequest(path,{method:id?"PUT":"POST",body:JSON.stringify(body)});
    setEditing(null);setConfirm(false);setMessage("Đã lưu và ghi lịch sử thay đổi quyền.");
    await refresh({silent:true});await load();
  }catch(e){setError(e.message);setConfirm(false);}finally{setBusy(false);}}
  return <main className="page-content iteration3-admin">
    <div className="page-heading"><div><p className="eyebrow">CFG-02 · UC-34</p><h1>Tài khoản và phân quyền</h1><p className="page-subtitle">Quản lý quyền truy cập, trạng thái tài khoản và nhóm quyền.</p></div><button className="secondary-button" disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}>Làm mới</button></div>
    {error&&<p role="alert" className="form-error">{error}</p>}{message&&<p role="status" className="success-message">{message}</p>}
    <section className="dashboard-section"><h2>Tìm tài khoản</h2><form className="admin-filters" onSubmit={e=>{e.preventDefault();setApplied({...filters,page:0});}}>
      <label>Tên, username hoặc email<input maxLength={100} value={filters.query} onChange={e=>setFilters({...filters,query:e.target.value})}/></label>
      <label>Trạng thái<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Tất cả trạng thái</option>{Object.entries(statusNames).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
      <label>Nhóm quyền<select value={filters.role} onChange={e=>setFilters({...filters,role:e.target.value})}><option value="">Tất cả nhóm quyền</option>{data?.roles.map(r=><option key={r.id} value={r.name}>{r.name}</option>)}</select></label><button>Tìm kiếm</button>
    </form></section>
    {!data?<p>Đang tải tài khoản…</p>:<>
      <section className="dashboard-section"><h2>Tài khoản · {data.total}</h2><div className="admin-table-scroll"><table><thead><tr><th>Tài khoản</th><th>Doanh nghiệp</th><th>Nhóm quyền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data.users.map(u=><tr key={u.id}><td><strong>{u.username}</strong><span>{u.fullName}</span><span>{u.email}</span></td><td>{u.companyName||"Chưa liên kết"}</td><td>{data.roles.filter(r=>u.roleIds.includes(r.id)).map(r=><span key={r.id}>{r.name}{r.status!=="ACTIVE"?" (ngừng hoạt động)":""}</span>)}</td><td>{statusNames[u.status]}</td><td><button className="secondary-button" onClick={()=>openUser(u)}>Sửa {u.username}</button></td></tr>)}</tbody></table>{!data.users.length&&<p>Không có tài khoản phù hợp.</p>}</div>
        <div className="admin-pagination"><button className="secondary-button" disabled={!applied.page} onClick={()=>setApplied({...applied,page:applied.page-1})}>Trang trước</button><span>Trang {applied.page+1} · {data.total} tài khoản</span><button className="secondary-button" disabled={(applied.page+1)*data.size>=data.total} onClick={()=>setApplied({...applied,page:applied.page+1})}>Trang sau</button></div>
      </section>
      <section className="dashboard-section"><div className="section-heading"><h2>Nhóm quyền và năng lực</h2><button onClick={()=>openRole(null)}>Tạo nhóm quyền</button></div><p>Quyền cập nhật từ database ở mỗi yêu cầu. Khóa tài khoản sẽ thu hồi phiên đang đăng nhập. Tên và năng lực role hệ thống được bảo vệ.</p><div className="admin-table-scroll"><table><thead><tr><th>Role</th><th>Năng lực được cấp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data.roles.map(r=><tr key={r.id}><td><strong>{r.name}</strong><span>{r.description}</span></td><td>{r.permissions.map(p=><span key={p}>{capabilityNames[p]||p}</span>)}</td><td>{statusNames[r.status]}</td><td><button className="secondary-button" onClick={()=>openRole(r)}>Sửa role {r.name}</button></td></tr>)}</tbody></table></div></section>
    </>}
    {editing&&<ModalShell title={confirm?"Xác nhận thay đổi quyền":editing.kind==="user"?`Chỉnh quyền ${editing.label}`:editing.id?`Chỉnh nhóm ${editing.name}`:"Tạo nhóm quyền"} onClose={()=>{if(!busy){setEditing(null);setConfirm(false);}}}>
      {error&&<p role="alert" className="form-error">{error}</p>}
      {confirm?<><p>{editing.kind==="user"?editing.label:editing.name} → {statusNames[editing.status]}</p><ul>{(editing.kind==="user"?data.roles.filter(r=>editing.roleIds.includes(r.id)).map(r=>r.name):editing.permissions).map(x=><li key={x}>{x}</li>)}</ul><p>Lý do: {editing.reason}</p><p>Thay đổi có hiệu lực cho các yêu cầu tiếp theo của tài khoản liên quan.</p><div className="form-actions"><button disabled={busy} onClick={save}>Xác nhận lưu</button><button className="secondary-button" disabled={busy} onClick={()=>setConfirm(false)}>Quay lại</button></div></>:<form className="admin-editor" onSubmit={e=>{e.preventDefault();if(!(editing.kind==="user"?editing.roleIds:editing.permissions).length){setError("Chọn ít nhất một nhóm quyền hoặc năng lực.");return;}setError("");setConfirm(true);}}>
        {editing.kind==="role"&&<><label>Mã nhóm quyền<input required pattern="[A-Z][A-Z0-9_]{2,49}" maxLength={50} disabled={editing.builtIn} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value.toUpperCase()})}/></label><label>Mô tả<input required maxLength={255} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label></>}
        <label>Trạng thái mới<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})}>{Object.entries(statusNames).filter(([v])=>editing.kind==="user"||v!=="LOCKED").map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
        <fieldset><legend>{editing.kind==="user"?"Nhóm quyền được cấp":"Năng lực được cấp"}</legend>{editing.kind==="user"?data.roles.map(r=><label className="admin-check" key={r.id}><input type="checkbox" checked={editing.roleIds.includes(r.id)} disabled={r.status!=="ACTIVE"&&!editing.roleIds.includes(r.id)} onChange={()=>toggle("roleIds",r.id)}/>{r.name} {r.status!=="ACTIVE"?"(ngừng hoạt động)":""}</label>):data.permissions.map(p=><label className="admin-check" key={p}><input type="checkbox" disabled={editing.builtIn} checked={editing.permissions.includes(p)} onChange={()=>toggle("permissions",p)}/>{capabilityNames[p]}</label>)}</fieldset>
        <label>Lý do thay đổi<textarea required maxLength={500} value={editing.reason} onChange={e=>setEditing({...editing,reason:e.target.value})}/></label><button>Kiểm tra thay đổi</button>
      </form>}
    </ModalShell>}
  </main>;
}
