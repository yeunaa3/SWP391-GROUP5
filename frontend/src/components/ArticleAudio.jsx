import { useEffect, useRef, useState } from "react";

function splitForSpeech(text) {
  const chunks = []; let chunk = "";
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    if (chunk.length + word.length > 220 && chunk) { chunks.push(chunk); chunk = ""; }
    chunk += `${chunk ? " " : ""}${word}`;
    if (/[.!?…]$/.test(word) && chunk.length > 70) { chunks.push(chunk); chunk = ""; }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export default function ArticleAudio({ article, locked }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const [voices, setVoices] = useState([]);
  const [voiceId, setVoiceId] = useState("");
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const run = useRef(0);
  const utterance = useRef(null);
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const update = () => {
      const available = synth.getVoices().filter(voice => /^vi(?:-|_)?/i.test(voice.lang));
      setVoices(available); setVoiceId(current => available.some(voice => voice.voiceURI === current) ? current : available[0]?.voiceURI || "");
    };
    update(); synth.addEventListener("voiceschanged", update);
    return () => { run.current++; synth.cancel(); synth.removeEventListener("voiceschanged", update); };
  }, [supported]);
  useEffect(() => { if (supported) { run.current++; window.speechSynthesis.cancel(); setStatus("idle"); setProgress(0); } }, [locked, supported]);
  function stop() { run.current++; window.speechSynthesis.cancel(); utterance.current = null; setStatus("idle"); setProgress(0); }
  function start() {
    const voice = voices.find(item => item.voiceURI === voiceId);
    if (!voice) { setError("Thiết bị chưa có giọng đọc tiếng Việt."); return; }
    stop(); setError(""); setStatus("playing");
    const token = run.current;
    const content = locked ? article.summary : article.content || article.summary;
    const chunks = splitForSpeech([article.title, content].filter(Boolean).join(". "));
    const speak = index => {
      if (token !== run.current) return;
      if (index >= chunks.length) { setStatus("done"); setProgress(100); return; }
      const speech = new SpeechSynthesisUtterance(chunks[index]);
      speech.lang = "vi-VN"; speech.voice = voice; speech.rate = rate; utterance.current = speech;
      speech.onend = () => { if (token === run.current) { setProgress(Math.round((index + 1) / chunks.length * 100)); speak(index + 1); } };
      speech.onerror = event => { if (token === run.current && !["canceled", "interrupted"].includes(event.error)) {
        run.current++; setStatus("idle"); setError("Không phát được giọng đọc. Thử giọng khác hoặc kiểm tra âm thanh thiết bị.");
      } };
      window.speechSynthesis.speak(speech);
    };
    speak(0);
  }
  function toggle() {
    if (status === "playing") { window.speechSynthesis.pause(); setStatus("paused"); }
    else if (status === "paused") { window.speechSynthesis.resume(); setStatus("playing"); }
    else start();
  }
  const busy = status === "playing" || status === "paused";
  return <section className={`article-audio ${status === "playing" ? "audio-playing" : ""}`} aria-label="Đọc báo thành tiếng">
    <div className="audio-heading"><div className="audio-wave" aria-hidden="true"><i/><i/><i/><i/><i/></div><div><strong>Nghe bài viết</strong><small>{locked ? "Chỉ đọc phần xem trước" : article.sourceUrl ? "Đọc phần giới thiệu từ RSS" : "Đọc nội dung bài viết"}</small></div><span className="audio-tag">AUDIO</span></div>
    {!supported ? <p>Trình duyệt này chưa hỗ trợ đọc thành tiếng.</p> : <>
      <div className="audio-controls"><button onClick={toggle} disabled={!voices.length}>{status === "playing" ? "Ⅱ Tạm dừng" : status === "paused" ? "▶ Tiếp tục" : status === "done" ? "↻ Nghe lại" : "▶ Đọc thành tiếng"}</button>{busy && <button className="audio-stop" onClick={stop}>■ Dừng</button>}
        <label>Giọng đọc<select value={voiceId} onChange={event => setVoiceId(event.target.value)} disabled={busy || !voices.length}>{!voices.length && <option value="">Chưa có giọng tiếng Việt</option>}{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}</select></label>
        <label>Tốc độ<select value={rate} onChange={event => setRate(Number(event.target.value))} disabled={busy}>{[0.75,1,1.25,1.5].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
      </div><div className="audio-progress"><progress value={progress} max="100" aria-label="Tiến độ đọc"/><span role="status">{!voices.length ? "Chưa có giọng đọc" : status === "done" ? "Đã đọc xong" : status === "paused" ? "Đang tạm dừng" : status === "playing" ? `Đang đọc · ${progress}%` : "Sẵn sàng nghe"}</span></div>
      {!voices.length && <p className="audio-note">Chưa tìm thấy giọng tiếng Việt trên thiết bị/trình duyệt. Bật giọng tiếng Việt trong cài đặt giọng nói hoặc thử trình duyệt có hỗ trợ. Giọng đọc phụ thuộc thiết bị, không phải dịch vụ AI riêng.</p>}
      {error && <p role="alert" className="audio-note">{error}</p>}
    </>}
  </section>;
}
