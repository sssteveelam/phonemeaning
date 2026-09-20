"use client";

import { Globe2, LoaderCircle, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ViettelPlan, ViettelSimRecord } from "@/lib/viettelSimCrawler";

interface ViettelSimSearchProps {
  onResults: (records: ViettelSimRecord[], query: { pattern: string; plan: ViettelPlan }) => void;
}

interface SearchResponse {
  items?: ViettelSimRecord[];
  error?: string;
  code?: string;
  warning?: string;
  stale?: boolean;
  pattern?: string;
  plan?: ViettelPlan;
}

function explainCrawlerError(payload: SearchResponse): string {
  if (payload.code === "rate_limited") {
    return "Viettel đang giới hạn tần suất. Hãy chờ khoảng 10 giây rồi thử lại.";
  }
  if (payload.code === "challenge" || payload.code === "captcha") {
    return "Viettel đang yêu cầu xác minh tạm thời. Hãy thử lại sau ít phút.";
  }
  if (payload.code === "network") {
    return "Không kết nối được kho SIM Viettel. Kiểm tra mạng rồi thử lại.";
  }
  return payload.error ?? "Không lấy được danh sách SIM.";
}

export function ViettelSimSearch({ onResults }: ViettelSimSearchProps) {
  const [pattern, setPattern] = useState("0989*");
  const [plan, setPlan] = useState<ViettelPlan>("pre");
  const [max, setMax] = useState("45");
  const [passes, setPasses] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const search = async () => {
    setLoading(true);
    setError("");
    setStatus("Đang hỏi kho SIM Viettel…");

    try {
      const response = await fetch("/api/viettel/sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern,
          plan,
          max: Number(max) || 45,
          passes: Number(passes) || 1
        })
      });
      const payload = await response.json().catch(() => ({})) as SearchResponse;
      if (!response.ok) throw new Error(explainCrawlerError(payload));

      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) throw new Error("Không tìm thấy số phù hợp với mẫu này.");

      const resolvedPattern = payload.pattern ?? pattern;
      const resolvedPlan = payload.plan ?? plan;
      onResults(items, { pattern: resolvedPattern, plan: resolvedPlan });
      setStatus(payload.warning
        ? `${payload.warning} Đã hiển thị ${items.length} số.`
        : `Đã lấy ${items.length} số · đang hiển thị theo điểm luận giải.`);
    } catch (caught) {
      setStatus("");
      setError(caught instanceof Error ? caught.message : "Có lỗi khi lấy số Viettel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel viettel-search-panel">
      <div className="viettel-search-head">
        <div>
          <p className="eyebrow">Nguồn số trực tuyến</p>
          <h2>Cào số Viettel rồi luận giải</h2>
          <p className="muted-copy">Lấy số từ kho SIM Viettel, sau đó chạy đúng bảng ý nghĩa và scoring hiện tại.</p>
        </div>
        <div className="viettel-badge"><Globe2 size={15} /> Viettel</div>
      </div>

      <div className="viettel-search-fields">
        <label>
          <span>Mẫu tìm số</span>
          <input
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="0989*"
            aria-label="Mẫu tìm số Viettel"
            spellCheck={false}
          />
        </label>
        <label>
          <span>Loại thuê bao</span>
          <select value={plan} onChange={(event) => setPlan(event.target.value as ViettelPlan)} aria-label="Loại thuê bao">
            <option value="pre">Trả trước</option>
            <option value="post">Trả sau</option>
          </select>
        </label>
        <label>
          <span>Tối đa số</span>
          <select value={max} onChange={(event) => setMax(event.target.value)} aria-label="Số lượng số cần lấy">
            <option value="15">15 số</option>
            <option value="45">45 số</option>
            <option value="90">90 số</option>
            <option value="135">135 số</option>
          </select>
        </label>
        <label>
          <span>Lượt gom thêm</span>
          <select value={passes} onChange={(event) => setPasses(event.target.value)} aria-label="Số lượt gom thêm">
            <option value="1">1 lượt</option>
            <option value="2">2 lượt</option>
            <option value="3">3 lượt</option>
          </select>
        </label>
        <button className="primary-button viettel-search-button" onClick={() => void search()} disabled={loading || !pattern.trim()}>
          {loading ? <><LoaderCircle size={16} className="spin" /> Đang lấy số…</> : <><Search size={16} /> Lấy số & luận giải</>}
        </button>
      </div>

      <div className="viettel-patterns">
        <span>Mẫu nhanh</span>
        {["0989*", "098*", "096*", "097*"].map((item) => (
          <button key={item} onClick={() => setPattern(item)}>{item}</button>
        ))}
      </div>
      {status && <p className="viettel-status"><Sparkles size={14} />{status}</p>}
      {error && <p className="gemini-error viettel-error">{error}</p>}
    </section>
  );
}
