import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";

export default function usePremiumPlan() {
  const { packageId } = useParams();
  const [state, setState] = useState({ loading: true, plan: null, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ loading: true, plan: null, error: false });
    apiRequest("/api/subscription-packages").then(plans => {
      if (alive) setState({ loading: false, plan: plans.find(item => String(item.id) === packageId) || null, error: false });
    }).catch(() => { if (alive) setState({ loading: false, plan: null, error: true }); });
    return () => { alive = false; };
  }, [packageId, attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
