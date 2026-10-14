import { useAuth } from "../store/AuthContext.jsx";
import { readerPolicy } from "../utils/readerPolicy.js";

export default function useReaderPolicy() {
  const {user,premiumActive,premiumLoading,loading} = useAuth();
  const policy = readerPolicy(user,premiumActive);
  return {...policy,showAdvertising:policy.showAdvertising && !loading && !premiumLoading};
}
