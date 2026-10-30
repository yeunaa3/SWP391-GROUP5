import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";

function splitForSpeech(text) {
  const chunks = [];
  let chunk = "";
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    if (chunk.length + word.length > 200 && chunk) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += `${chunk ? " " : ""}${word}`;
    if (/[.!?…;:\n]$/.test(word) && chunk.length > 60) {
      chunks.push(chunk);
      chunk = "";
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export default function ArticleAudio({ article, locked }) {
  const { premiumActive } = useAuth();
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  const [voices, setVoices] = useState([]);
  const [voiceId, setVoiceId] = useState("");
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState("idle"); // idle | starting | playing | paused | done
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [hasViVoice, setHasViVoice] = useState(true);

  const run = useRef(0);
  const utterance = useRef(null);
  const startupTimer = useRef(null);
  const resumeTimer = useRef(null);

  // Nạp danh sách giọng đọc từ trình duyệt
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const allVoices = synth.getVoices() || [];
      if (!allVoices.length) return;

      const viList = allVoices.filter((v) => /^vi(?:-|_)?/i.test(v.lang));
      setVoices(viList.length ? viList : allVoices);
      setHasViVoice(viList.length > 0);

      // Ưu tiên chọn giọng tiếng Việt (đặc biệt giọng Edge Natural như HoaiMy, NamMinh)
      if (viList.length) {
        setVoiceId((prev) => {
          if (viList.some((v) => v.voiceURI === prev)) return prev;
          const natural = viList.find((v) => /natural|online/i.test(v.name));
          return natural ? natural.voiceURI : viList[0].voiceURI;
        });
      } else {
        // Fallback: chọn giọng mặc định của hệ thống
        const def = allVoices.find((v) => v.default) || allVoices[0];
        setVoiceId(def?.voiceURI || "");
      }
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);

    // Một số trình duyệt (Chrome) cần thử lại vài lần để nạp xong voice list
    let attempts = 0;
    const interval = setInterval(() => {
      loadVoices();
      if (++attempts >= 8) clearInterval(interval);
    }, 500);

    return () => {
      run.current++;
      clearInterval(interval);
      clearTimeout(startupTimer.current);
      clearInterval(resumeTimer.current);
      synth.cancel();
      synth.removeEventListener("voiceschanged", loadVoices);
    };
  }, [supported]);

  // Hủy đọc khi chuyển bài viết
  useEffect(() => {
    if (supported) {
      run.current++;
      clearTimeout(startupTimer.current);
      clearInterval(resumeTimer.current);
      window.speechSynthesis.cancel();
      setStatus("idle");
      setProgress(0);
      setError("");
    }
  }, [article.slug, supported]);

  function stop() {
    run.current++;
    clearTimeout(startupTimer.current);
    clearInterval(resumeTimer.current);
    if (supported) {
      window.speechSynthesis.cancel();
    }
    utterance.current = null;
    setStatus("idle");
    setProgress(0);
  }

  function start() {
    if (!supported) {
      setError("Trình duyệt này không hỗ trợ Web Speech API.");
      return;
    }

    stop();
    setError("");
    setStatus("starting");

    const token = run.current;
    // Nội dung đọc: Độc giả thường đọc tóm tắt; Premium đọc toàn bài
    const content = locked ? article.summary : article.content || article.summary;
    const fullText = [article.title, content].filter(Boolean).join(". ");
    const chunks = splitForSpeech(fullText);

    if (!chunks.length) {
      setError("Bài viết không có nội dung văn bản để đọc.");
      setStatus("idle");
      return;
    }

    // Tìm voice phù hợp
    const allVoices = window.speechSynthesis.getVoices() || [];
    const selectedVoice =
      allVoices.find((v) => v.voiceURI === voiceId) ||
      allVoices.find((v) => /^vi(?:-|_)?/i.test(v.lang)) ||
      allVoices.find((v) => v.default) ||
      allVoices[0] ||
      null;

    const speak = (index) => {
      if (token !== run.current) return;
      if (index >= chunks.length) {
        setStatus("done");
        setProgress(100);
        clearInterval(resumeTimer.current);
        return;
      }

      const speech = new SpeechSynthesisUtterance(chunks[index]);
      speech.lang = "vi-VN";
      if (selectedVoice) {
        speech.voice = selectedVoice;
      }
      speech.rate = rate;
      utterance.current = speech;

      speech.onstart = () => {
        if (token === run.current) {
          clearTimeout(startupTimer.current);
          setStatus("playing");
        }
      };

      speech.onend = () => {
        if (token === run.current) {
          setProgress(Math.round(((index + 1) / chunks.length) * 100));
          setTimeout(() => speak(index + 1), 60);
        }
      };

      speech.onerror = (e) => {
        if (token === run.current && !["canceled", "interrupted"].includes(e.error)) {
          clearTimeout(startupTimer.current);
          clearInterval(resumeTimer.current);
          run.current++;
          setStatus("idle");
          setError(
            `Lỗi phát giọng đọc (${e.error}). Hãy thử mở trang bằng Microsoft Edge để có giọng đọc tiếng Việt chuẩn nhất.`
          );
        }
      };

      // Timeout dự phòng nếu speech synthesis bị treo do trình duyệt
      clearTimeout(startupTimer.current);
      startupTimer.current = setTimeout(() => {
        if (token === run.current && status === "starting") {
          // Thử resume lại speech synthesis
          window.speechSynthesis.resume();
        }
      }, 3000);

      window.speechSynthesis.resume();
      window.speechSynthesis.speak(speech);
    };

    // Chrome khắc phục lỗi tự động dừng speech sau 15 giây
    clearInterval(resumeTimer.current);
    resumeTimer.current = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 8000);

    // Chờ 80ms sau lệnh cancel để hàng đợi sẵn sàng
    setTimeout(() => speak(0), 80);
  }

  function toggle() {
    if (!supported) return;
    if (status === "playing") {
      window.speechSynthesis.pause();
      setStatus("paused");
    } else if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("playing");
    } else {
      start();
    }
  }

  const busy = status === "playing" || status === "paused" || status === "starting";

  return (
    <section
      className={`article-audio ${status === "playing" ? "audio-playing" : ""}`}
      aria-label="Đọc báo thành tiếng"
    >
      <div className="audio-heading">
        <div className="audio-wave" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div>
          <strong>Nghe bài viết</strong>
          <small>
            {locked
              ? "Bản xem trước · Nâng cấp Premium để nghe toàn bộ"
              : article.sourceUrl && article.contentMode !== "PUBLIC_TEXT"
              ? "Đọc phần giới thiệu từ RSS"
              : "Đọc đầy đủ nội dung bài viết"}
          </small>
        </div>
        <span className="audio-tag">
          {locked ? "PREVIEW" : "AUDIO"}
        </span>
      </div>

      {!supported ? (
        <p style={{ color: "#ef4444", margin: "10px 0 0" }}>
          Trình duyệt của bạn không hỗ trợ tính năng đọc thành tiếng Web Speech API.
        </p>
      ) : (
        <>
          <div className="audio-controls">
            <button
              onClick={toggle}
              disabled={status === "starting"}
              style={{ minWidth: "140px" }}
            >
              {status === "starting"
                ? "Đang khởi động…"
                : status === "playing"
                ? "⏸ Tạm dừng"
                : status === "paused"
                ? "▶ Tiếp tục"
                : status === "done"
                ? "↻ Nghe lại"
                : "▶ Đọc thành tiếng"}
            </button>

            {busy && (
              <button className="audio-stop" onClick={stop}>
                ⏹ Dừng
              </button>
            )}

            <label>
              Giọng đọc
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                disabled={busy}
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} {/^vi/i.test(v.lang) ? "(Tiếng Việt)" : `(${v.lang})`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Tốc độ
              <select
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                disabled={busy}
              >
                {[0.75, 1, 1.25, 1.5].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="audio-progress">
            <progress value={progress} max="100" aria-label="Tiến độ đọc" />
            <span role="status">
              {status === "done"
                ? "Đã đọc xong"
                : status === "paused"
                ? "Đang tạm dừng"
                : status === "playing"
                ? `Đang đọc · ${progress}%`
                : status === "starting"
                ? "Đang khởi động…"
                : "Sẵn sàng nghe"}
            </span>
          </div>

          {!hasViVoice && (
            <p className="audio-note" style={{ color: "#b45309", background: "#fef3c7", padding: "6px 12px", borderRadius: "6px", marginTop: "8px" }}>
              💡 Trình duyệt hiện tại chưa cài gói giọng tiếng Việt riêng biệt. Hệ thống vẫn phát bằng giọng tổng hợp sẵn có. <strong>Mẹo: Mở trang bằng Microsoft Edge</strong> để có giọng đọc AI tiếng Việt tự nhiên nhất (Hoài My, Nam Minh).
            </p>
          )}

          {locked && !premiumActive && (
            <p className="audio-note" style={{ marginTop: "6px" }}>
              Bạn đang nghe bản tóm tắt bài viết.{" "}
              <Link to="/premium/packages" style={{ color: "#4f46e5", fontWeight: "600" }}>
                Đăng ký gói Premium
              </Link>{" "}
              để nghe toàn bộ nội dung và trải nghiệm đọc báo không quảng cáo.
            </p>
          )}

          {error && (
            <p role="alert" className="audio-note" style={{ color: "#dc2626" }}>
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
