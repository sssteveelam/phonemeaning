import { ArrowDownAZ, ArrowUpDown, ChevronRight, Medal } from "lucide-react";
import type { RankedPhoneRow } from "@/types/phone";

export type RankingSort = "score-desc" | "score-asc" | "sum" | "phone";

export function RankingTable({
  rows,
  onSelect,
  sort,
  onSort,
  showSource = false
}: {
  rows: RankedPhoneRow[];
  onSelect: (row: RankedPhoneRow) => void;
  sort: RankingSort;
  onSort: (sort: RankingSort) => void;
  showSource?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Hạng</th><th>Số điện thoại</th>{showSource && <th>Giá Viettel</th>}<th><button className="table-sort" onClick={() => onSort(sort === "score-desc" ? "score-asc" : "score-desc")}>Điểm <ArrowUpDown size={13} /></button></th><th>Tổng</th><th>Ý nghĩa tổng</th><th>Đánh giá</th><th /></tr></thead>
        <tbody>
          {rows.map((row) => {
            const { analysis, rank, source } = row;
            return (
              <tr
                key={`${analysis.phoneNumber}-${rank}`}
                tabIndex={0}
                aria-label={`Xem chi tiết số ${analysis.phoneNumber}`}
                onClick={() => onSelect(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(row);
                  }
                }}
              >
                <td><span className={`rank-badge rank-${rank}`}>{rank <= 3 ? <Medal size={14} /> : rank}</span></td>
                <td className="phone-cell">{analysis.phoneNumber}</td>
                {showSource && <td>{source?.priceLabel ?? "—"}</td>}
                <td><strong>{analysis.score}</strong></td>
                <td>{analysis.digitSum}</td>
                <td className="meaning-cell">{analysis.totalMeaning ?? "—"}</td>
                <td><span className="mini-rating">{analysis.rating}</span></td>
                <td><ChevronRight size={17} className="chevron" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <div className="empty-state"><ArrowDownAZ size={24} /><p>Không có số phù hợp bộ lọc.</p></div>}
    </div>
  );
}
