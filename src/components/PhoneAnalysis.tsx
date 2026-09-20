import { AlertTriangle, BadgeCheck, Copy, Hash, Repeat2 } from "lucide-react";
import type { PhoneAnalysis, RankedPhoneRow } from "@/types/phone";
import { ScoreCard } from "@/components/ScoreCard";
import { GeminiInsight } from "@/components/GeminiInsight";

export function PhoneAnalysisView({ analysis, source }: { analysis: PhoneAnalysis; source?: RankedPhoneRow["source"] }) {
  if (!analysis.valid) return <div className="error-box"><AlertTriangle size={18} />{analysis.error}</div>;
  return (
    <div className="analysis-stack">
      <section className="panel phone-hero-card">
        <div>
          <p className="eyebrow">Số điện thoại</p>
          <h2 className="phone-display">{analysis.phoneNumber}</h2>
          <p className="muted-copy">{source ? `Nguồn Viettel · ${source.plan === "pre" ? "trả trước" : "trả sau"} · ${source.priceLabel || "chưa có giá"}` : "Đã chuẩn hóa tại trình duyệt, không gửi dữ liệu ra ngoài."}</p>
        </div>
        <button className="icon-button" onClick={() => navigator.clipboard?.writeText(analysis.phoneNumber)} title="Sao chép số"><Copy size={17} /></button>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Liền kề + đầu/cuối</p><h2>Các cặp số</h2></div>
          <span className="count-badge">{analysis.pairs.length} cặp</span>
        </div>
        <div className="pair-chips">
          {analysis.pairs.map((pair) => (
            <span key={`${pair.pair}-${pair.index}`} className={`pair-chip ${pair.isRepeated ? "is-repeated" : ""} ${pair.isNegatedBy00 ? "is-negated" : ""}`}>
              {pair.pair}
              {pair.isNegatedBy00 && <small>phủ định</small>}
            </span>
          ))}
        </div>
        {analysis.repeatedPairs.length > 0 && <div className="repeat-note"><Repeat2 size={16} /><span>{analysis.repeatedPairs.map((item) => `${item.pair} xuất hiện ${item.count} lần${item.consecutive ? " liên tiếp" : ""}`).join(" · ")}</span></div>}
        {analysis.negatedPairs.length > 0 && <div className="negation-note"><Hash size={16} /><span>00 → phủ định cặp {analysis.negatedPairs.join(", ")}</span></div>}
      </section>

      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Tra cứu theo bảng 01–99</p><h2>Chi tiết ý nghĩa</h2></div></div>
        <div className="meaning-list">
          {analysis.pairs.map((pair) => (
            <div className={`meaning-row ${pair.isNegatedBy00 ? "muted-row" : ""}`} key={`${pair.pair}-meaning-${pair.index}`}>
              <span className={`meaning-key ${pair.sentiment}`}>{pair.pair}</span>
              <div><p>{pair.meaning}</p>{pair.isNegatedBy00 && <small>Ý nghĩa bị phủ định bởi cặp 00 đứng ngay sau.</small>}</div>
              {pair.pair === "00" && <BadgeCheck size={16} className="muted-icon" />}
            </div>
          ))}
        </div>
      </section>

      <div className="summary-grid">
        <section className="panel total-card">
          <p className="eyebrow">Tổng chữ số</p>
          <div className="total-number">{analysis.digitSum}</div>
          <p>{analysis.totalMeaning ?? "Không có dữ liệu trong bảng."}</p>
          <small>Cộng toàn bộ chữ số, bao gồm cả 0.</small>
        </section>
        <ScoreCard analysis={analysis} />
      </div>
      <GeminiInsight analysis={analysis} />
    </div>
  );
}
