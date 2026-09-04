import { CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import type { PhoneAnalysis } from "@/types/phone";

export function ScoreCard({ analysis }: { analysis: PhoneAnalysis }) {
  return (
    <section className="panel score-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Đánh giá deterministic</p>
          <h2>Điểm nổi bật</h2>
        </div>
        <div className="score-orb">
          <span>{analysis.score}</span>
          <small>/100</small>
        </div>
      </div>
      <div className="rating-pill"><Sparkles size={15} /> {analysis.rating}</div>
      <div className="score-grid">
        <div>
          <p className="muted-label">Điểm mạnh</p>
          {analysis.strengths.length ? analysis.strengths.map((item) => <p className="signal positive" key={item}><CheckCircle2 size={15} />{item}</p>) : <p className="empty-copy">Chưa có cặp tích cực nổi bật.</p>}
        </div>
        <div>
          <p className="muted-label">Điểm cần lưu ý</p>
          {analysis.warnings.length ? analysis.warnings.map((item) => <p className="signal warning" key={item}><CircleAlert size={15} />{item}</p>) : <p className="empty-copy">Không có cảnh báo nổi bật.</p>}
        </div>
      </div>
    </section>
  );
}
