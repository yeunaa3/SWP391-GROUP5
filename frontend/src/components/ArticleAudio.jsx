import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";

function splitForSpeech(text) {
    const chunks = [];
    let chunk = "";
    for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
        if (chunk.length + word.length > 220 && chunk) {
            chunks.push(chunk);
            chunk = "";
        }
        chunk += `${chunk ? " " : ""}${word}`;
        if (/[.!?…]$/.test(word) && chunk.length > 70) {
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
    const [status, setStatus] = useState("idle");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const run = useRef(0);
    const utterance = useRef(null);
    const startupTimer = useRef(null);
    useEffect(() => {
        if (!supported) return;
        const synth = window.speechSynthesis;
        const update = () => {
            const available = synth
                .getVoices()
                .filter((voice) => /^vi(?:-|_)?/i.test(voice.lang));
            setVoices(available);
            setVoiceId((current) =>
                available.some((voice) => voice.voiceURI === current)
                    ? current
                    : available[0]?.voiceURI || "",
            );
        };
        update();
        synth.addEventListener("voiceschanged", update);
        let tries = 0;
        const timer = setInterval(() => {
            update();
            if (++tries >= 10) clearInterval(timer);
        }, 1000);
        return () => {
            run.current++;
            clearInterval(timer);
            clearTimeout(startupTimer.current);
            synth.cancel();
            synth.removeEventListener("voiceschanged", update);
        };
    }, [supported]);
    useEffect(() => {
        if (supported) {
            run.current++;
            clearTimeout(startupTimer.current);
            window.speechSynthesis.cancel();
            setStatus("idle");
            setProgress(0);
        }
    }, [locked, supported, premiumActive, article.slug]);
    function stop() {
        run.current++;
        clearTimeout(startupTimer.current);
        window.speechSynthesis.cancel();
        utterance.current = null;
        setStatus("idle");
        setProgress(0);
    }
    function start() {
        if (!premiumActive || locked || !supported) return;
        const available = window.speechSynthesis
            .getVoices()
            .filter((item) => /^vi(?:-|_)/i.test(item.lang));
        const voice =
            available.find((item) => item.voiceURI === voiceId) || available[0];
        if (!voice) {
            setError(
                "Chưa có giọng tiếng Việt để phát. Bật giọng tiếng Việt trong cài đặt ngôn ngữ/giọng nói của thiết bị rồi mở lại trang bằng Edge hoặc Chrome. Website chưa có dịch vụ audio độc lập.",
            );
            return;
        }
        setVoices(available);
        stop();
        setError("");
        setStatus("starting");
        const token = run.current;
        const content = locked
            ? article.summary
            : article.content || article.summary;
        const chunks = splitForSpeech(
            [article.title, content].filter(Boolean).join(". "),
        );
        const speak = (index) => {
            if (token !== run.current) return;
            if (index >= chunks.length) {
                setStatus("done");
                setProgress(100);
                return;
            }
            const speech = new SpeechSynthesisUtterance(chunks[index]);
            speech.lang = "vi-VN";
            if (voice) speech.voice = voice;
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
                    setProgress(
                        Math.round(((index + 1) / chunks.length) * 100),
                    );
                    setTimeout(() => speak(index + 1), 80);
                }
            };
            speech.onerror = (event) => {
                if (
                    token === run.current &&
                    !["canceled", "interrupted"].includes(event.error)
                ) {
                    clearTimeout(startupTimer.current);
                    run.current++;
                    setStatus("idle");
                    setError(
                        `Không phát được giọng đọc (${event.error}). Thử mở trang này bằng Edge hoặc Chrome và kiểm tra giọng tiếng Việt trên máy.`,
                    );
                }
            };
            clearTimeout(startupTimer.current);
            startupTimer.current = setTimeout(() => {
                if (token === run.current) {
                    stop();
                    setError(
                        "Trình duyệt không khởi động được giọng đọc. Hãy thử trang này trong Edge/Chrome; trình duyệt nhúng có thể không có bộ đọc tiếng Việt.",
                    );
                }
            }, 10000);
            window.speechSynthesis.resume();
            window.speechSynthesis.speak(speech);
        };
        // Let cancel() clear the previous queue before submitting a new utterance.
        setTimeout(() => speak(0), 80);
    }
    function toggle() {
        if (!premiumActive || locked || !supported) return;
        if (status === "playing") {
            window.speechSynthesis.pause();
            setStatus("paused");
        } else if (status === "paused") {
            window.speechSynthesis.resume();
            setStatus("playing");
        } else start();
    }
    const busy =
        status === "playing" || status === "paused" || status === "starting";
    if (!premiumActive)
        return (
            <section className="article-audio">
                <strong>✦ Đọc thành tiếng · Premium</strong>
                <p>Đăng ký gói để nghe bài viết và sử dụng đọc tập trung.</p>
                <Link to="/premium/packages">Xem quyền lợi Premium →</Link>
            </section>
        );
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
                            ? "Chỉ đọc phần xem trước"
                            : article.sourceUrl &&
                                article.contentMode !== "PUBLIC_TEXT"
                              ? "Đọc phần giới thiệu từ RSS"
                              : "Đọc nội dung bài viết"}
                    </small>
                </div>
                <span className="audio-tag">AUDIO</span>
            </div>
            {!supported ? (
                <p>Trình duyệt này chưa hỗ trợ đọc thành tiếng.</p>
            ) : (
                <>
                    <div className="audio-controls">
                        <button
                            onClick={toggle}
                            disabled={status === "starting"}
                        >
                            {status === "starting"
                                ? "Đang khởi động…"
                                : status === "playing"
                                  ? "Ⅱ Tạm dừng"
                                  : status === "paused"
                                    ? "▶ Tiếp tục"
                                    : status === "done"
                                      ? "↻ Nghe lại"
                                      : "▶ Đọc thành tiếng"}
                        </button>
                        {busy && (
                            <button className="audio-stop" onClick={stop}>
                                ■ Dừng
                            </button>
                        )}
                        <label>
                            Giọng đọc
                            <select
                                value={voiceId}
                                onChange={(event) =>
                                    setVoiceId(event.target.value)
                                }
                                disabled={busy || !voices.length}
                            >
                                {!voices.length && (
                                    <option value="">
                                        Tự chọn theo tiếng Việt (trình duyệt)
                                    </option>
                                )}
                                {voices.map((voice) => (
                                    <option
                                        key={voice.voiceURI}
                                        value={voice.voiceURI}
                                    >
                                        {voice.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Tốc độ
                            <select
                                value={rate}
                                onChange={(event) =>
                                    setRate(Number(event.target.value))
                                }
                                disabled={busy}
                            >
                                {[0.75, 1, 1.25, 1.5].map((value) => (
                                    <option key={value} value={value}>
                                        {value}×
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="audio-progress">
                        <progress
                            value={progress}
                            max="100"
                            aria-label="Tiến độ đọc"
                        />
                        <span role="status">
                            {!voices.length
                                ? "Chưa có giọng đọc"
                                : status === "done"
                                  ? "Đã đọc xong"
                                  : status === "paused"
                                    ? "Đang tạm dừng"
                                    : status === "playing"
                                      ? `Đang đọc · ${progress}%`
                                      : "Sẵn sàng nghe"}
                        </span>
                    </div>
                    {!voices.length && (
                        <p className="audio-note">
                            Đang tìm giọng tiếng Việt. Nếu không tìm thấy, bổ
                            sung giọng tiếng Việt trên thiết bị rồi mở lại trang
                            bằng Edge/Chrome. Website chưa có dịch vụ tạo audio
                            độc lập.
                        </p>
                    )}
                    {error && (
                        <p role="alert" className="audio-note">
                            {error}
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
