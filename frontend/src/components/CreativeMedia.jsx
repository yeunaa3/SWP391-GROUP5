import { useState } from "react";

/** API-05: lỗi 404/quyền/storage hiển thị fallback; không đổi sang URL cloud công khai để lách quyền. */
export default function CreativeMedia({creative,...props}){
  const [failed,setFailed]=useState(null),[attempt,setAttempt]=useState(0);
  const url=creative?.media_url;
  if(!url)return <p>Chưa có creative.</p>;
  if(failed===url)return <div className="info-note" role="status"><p>Không tải được tệp quảng cáo. Tệp có thể không còn khả dụng hoặc bạn không có quyền xem.</p><button type="button" className="secondary-button" onClick={()=>{setFailed(null);setAttempt(x=>x+1);}}>Thử tải lại tệp</button></div>;
  const mediaProps={...props,key:`${url}:${attempt}`,src:url,onError:()=>setFailed(url)};
  return creative?.mime_type?.startsWith("video/")||creative?.creative_type==="VIDEO"
    ?<video controls preload="metadata" {...mediaProps}/>:<img alt={creative.title||"Banner xem trước"} {...mediaProps}/>;
}
