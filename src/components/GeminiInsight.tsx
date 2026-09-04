import { Bot, LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import type { PhoneAnalysis } from "@/types/phone";

export function GeminiInsight({ analysis }: { analysis: PhoneAnalysis }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const askGemini = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis })
      });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Gemini không thể trả lời lúc này.");
      setText(payload.text ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Có lỗi khi gọi Gemini.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel gemini-panel">
      <div className="gemini-head">
        <div className="gemini-title"><div className="gemini-icon"><Bot size={18} /></div><div><p className="eyebrow">Trợ lý diễn giải</p><h2>Luận thêm với Gemini</h2></div></div>
        <button className="gemini-button" onClick={askGemini} disabled={loading}><Sparkles size={15} />{loading ? <><LoaderCircle size={15} className="spin" /> Đang luận…</> : text ? "Luận lại" : "Luận thêm"}</button>
      </div>
      <p className="muted-copy">Gemini chỉ diễn giải dữ liệu bảng đã có; không thay đổi điểm số hoặc tự thêm ý nghĩa.</p>
      {error && <p className="gemini-error">{error}</p>}
      {text && <div className="gemini-result">{text.split("\n").map((line, index) => line.trim() ? <p key={`${line}-${index}`}>{line}</p> : <br key={`break-${index}`} />)}</div>}
    </section>
  );
}
