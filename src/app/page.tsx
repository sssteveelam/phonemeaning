"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Check, ChevronDown, Download, FileSpreadsheet, Filter, Search, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { analyzePhoneNumber } from "@/lib/phoneAnalysisEngine";
import { exportRows, parsePhoneFile } from "@/lib/fileParser";
import { PhoneAnalysisView } from "@/components/PhoneAnalysis";
import { RankingTable, type RankingSort } from "@/components/RankingTable";
import { ViettelSimSearch } from "@/components/ViettelSimSearch";
import type { ViettelPlan, ViettelSimRecord } from "@/lib/viettelSimCrawler";
import type { PhoneAnalysis, ParsedPhone, RankedPhoneRow } from "@/types/phone";
import * as XLSX from "xlsx";

type Tab = "check" | "rank";
type FilterKey = "all" | "finance" | "career" | "love" | "opportunity" | "leadership" | "saving" | "best";

const samples = ["0366664670", "0984612963", "0372036001"];

const matchesFilter = (analysis: PhoneAnalysis, filter: FilterKey) => {
  if (filter === "all") return true;
  if (filter === "best") return analysis.score >= 75;
  const meaning = analysis.pairs.map((pair) => pair.meaning).join(" ").toLowerCase();
  const terms: Record<Exclude<FilterKey, "all" | "best">, string[]> = {
    finance: ["tiền", "tài chánh", "tài chính", "thu nhập", "giàu"],
    career: ["nghề nghiệp", "công việc", "học vấn"],
    love: ["tình cảm", "thương", "yêu", "lãng mạn", "duyên"],
    opportunity: ["cơ hội"],
    leadership: ["lãnh đạo", "quyền lực"],
    saving: ["giữ được tiền", "giữ tiền"]
  };
  return terms[filter].some((term) => meaning.includes(term));
};

const toExportRows = (rows: RankedPhoneRow[]) =>
  rows.map(({ analysis, rank, source }) => ({
    Rank: rank,
    Phone: analysis.phoneNumber,
    "Viettel Price": source?.priceLabel ?? "",
    Score: analysis.score,
    "Digit Sum": analysis.digitSum,
    "Total Meaning": analysis.totalMeaning ?? "",
    Pairs: analysis.pairs.map((pair) => pair.pair).join(" – "),
    "Positive Count": analysis.positiveCount,
    "Negative Count": analysis.negativeCount,
    "Repeated Pairs": analysis.repeatedPairs.map((pair) => `${pair.pair} x${pair.count}`).join("; "),
    Warnings: analysis.warnings.join("; "),
    Rating: analysis.rating
  }));

const rankPhoneRows = (
  rows: ParsedPhone[],
  sourceByPhone: Record<string, ViettelSimRecord> = {}
): RankedPhoneRow[] => {
  const all = rows
    .filter((row) => row.valid)
    .map((row) => {
      const item = analyzePhoneNumber(row.phone);
      return { analysis: item, source: sourceByPhone[item.phoneNumber] };
    })
    .filter(({ analysis }) => analysis.valid);
  const sorted = [...all].sort((a, b) => b.analysis.score - a.analysis.score || (b.analysis.totalMeaning ? 1 : 0) - (a.analysis.totalMeaning ? 1 : 0));
  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
};

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("check");
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState<PhoneAnalysis | null>(null);
  const [fileRows, setFileRows] = useState<ParsedPhone[]>([]);
  const [ranked, setRanked] = useState<RankedPhoneRow[]>([]);
  const [sourceRecords, setSourceRecords] = useState<Record<string, ViettelSimRecord>>({});
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<RankingSort>("score-desc");
  const [selected, setSelected] = useState<RankedPhoneRow | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const detailModalRef = useRef<HTMLDivElement>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);

  const visibleRows = useMemo(() => ranked.filter(({ analysis }) => matchesFilter(analysis, filter)), [ranked, filter]);

  const runAnalysis = () => setAnalysis(analyzePhoneNumber(input));
  const handleFile = async (file?: File) => {
    if (!file) return;
    setIsParsing(true);
    setFileName(file.name);
    setSourceRecords({});
    setSelected(null);
    try {
      setFileRows(await parsePhoneFile(file));
      setRanked([]);
    } finally { setIsParsing(false); }
  };
  const analyzeAll = () => {
    setSelected(null);
    setRanked(rankPhoneRows(fileRows, sourceRecords));
  };
  const handleViettelResults = (records: ViettelSimRecord[], query: { pattern: string; plan: ViettelPlan }) => {
    const sources = Object.fromEntries(records.map((record) => [record.phone, record])) as Record<string, ViettelSimRecord>;
    const rows = records.map((record) => ({ raw: record.phone, phone: record.phone, valid: true }));
    setSelected(null);
    setSourceRecords(sources);
    setFileRows(rows);
    setFileName(`Viettel ${query.pattern} · ${query.plan === "pre" ? "trả trước" : "trả sau"}`);
    setRanked(rankPhoneRows(rows, sources));
    setFilter("all");
    setSort("score-desc");
  };
  const sortedVisibleRows = useMemo(() => {
    const copy = [...visibleRows];
    if (sort === "score-desc") copy.sort((a, b) => b.analysis.score - a.analysis.score || a.rank - b.rank);
    if (sort === "score-asc") copy.sort((a, b) => a.analysis.score - b.analysis.score || a.rank - b.rank);
    if (sort === "sum") copy.sort((a, b) => a.analysis.digitSum - b.analysis.digitSum || a.rank - b.rank);
    if (sort === "phone") copy.sort((a, b) => a.analysis.phoneNumber.localeCompare(b.analysis.phoneNumber) || a.rank - b.rank);
    return copy;
  }, [visibleRows, sort]);
  const detailRows = sortedVisibleRows;
  const selectedIndex = selected
    ? detailRows.findIndex((row) => row.rank === selected.rank && row.analysis.phoneNumber === selected.analysis.phoneNumber)
    : -1;
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < detailRows.length - 1;

  const goToPrevious = () => {
    if (canGoPrevious) setSelected(detailRows[selectedIndex - 1]);
  };
  const goToNext = () => {
    if (canGoNext) setSelected(detailRows[selectedIndex + 1]);
  };

  useEffect(() => {
    if (selected && selectedIndex < 0) setSelected(null);
  }, [selected, selectedIndex]);

  useEffect(() => {
    if (!selected) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelected(null);
        return;
      }

      const target = event.target as HTMLElement | null;
      if (event.isComposing || target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (selectedIndex > 0) setSelected(detailRows[selectedIndex - 1]);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < detailRows.length - 1) {
          setSelected(detailRows[selectedIndex + 1]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, selectedIndex, detailRows]);

  useEffect(() => {
    if (!selected) return;

    detailModalRef.current?.scrollTo({ top: 0, behavior: "auto" });
    modalCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  const downloadCsv = () => {
    const csv = exportRows(toExportRows(sortedVisibleRows));
    const header = Object.keys(toExportRows(sortedVisibleRows)[0] ?? {}).join(",");
    const blob = new Blob([`${header}\n${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "phone-analysis.csv"; anchor.click(); URL.revokeObjectURL(url);
  };
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(toExportRows(sortedVisibleRows));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Analysis");
    XLSX.writeFile(workbook, "phone-analysis.xlsx");
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><div><strong>PHONE MEANING</strong><span>ANALYZER</span></div></div>
        <div className="privacy-pill"><ShieldCheck size={15} /> Luận giải cục bộ · chỉ gọi Viettel khi bấm nút</div>
      </header>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">Bảng ý nghĩa 01–99 · single source of truth</p><h1>Đọc vị một số,<br /><em>chọn đúng một số.</em></h1><p>Tra cứu từng cặp số, nhận diện điểm mạnh – cảnh báo và tìm số nổi bật từ cả danh sách.</p></div>
        <div className="hero-stat"><BarChart3 size={23} /><div><strong>99</strong><span>mã ý nghĩa</span></div></div>
      </section>
      <nav className="tabs">
        <button className={tab === "check" ? "active" : ""} onClick={() => setTab("check")}><Search size={17} /> Check số</button>
        <button className={tab === "rank" ? "active" : ""} onClick={() => setTab("rank")}><BarChart3 size={17} /> Tìm số tốt nhất</button>
      </nav>

      {tab === "check" ? <section className="workspace">
        <div className="input-panel panel">
          <div><p className="eyebrow">Chức năng 01</p><h2>Nhập số điện thoại</h2><p className="muted-copy">Tách cặp từ số thứ hai đến cuối, rồi ghép thêm số đầu với số cuối.</p></div>
          <div className="input-row"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runAnalysis()} placeholder="Ví dụ: 0984612963" aria-label="Nhập số điện thoại" /><button className="primary-button" onClick={runAnalysis}>Phân tích <ChevronDown size={16} className="rotate-minus" /></button></div>
          <div className="sample-row"><span>Số mẫu</span>{samples.map((sample) => <button key={sample} onClick={() => setInput(sample)}>{sample}</button>)}</div>
        </div>
        {analysis && <PhoneAnalysisView analysis={analysis} />}
      </section> : <section className="workspace">
        <ViettelSimSearch onResults={handleViettelResults} />
        <div className="upload-panel panel" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files[0]); }}>
          <div className="upload-icon"><Upload size={24} /></div><p className="eyebrow">Chức năng 02</p><h2>Upload danh sách số</h2><p className="muted-copy">TXT, CSV, XLSX hoặc XLS · dữ liệu không rời khỏi thiết bị.</p>
          <button className="outline-button" onClick={() => fileInput.current?.click()}>{isParsing ? "Đang đọc…" : "Chọn file"} <FileSpreadsheet size={16} /></button>
          <input ref={fileInput} type="file" hidden accept=".txt,.csv,.xlsx,.xls" onChange={(event) => void handleFile(event.target.files?.[0])} />
          {fileName && <div className="file-status"><Check size={15} />{fileName} · {fileRows.length} dòng/cell đã đọc</div>}
        </div>
        {fileRows.length > 0 && <div className="panel import-summary"><div><p className="eyebrow">Đã đọc dữ liệu</p><h2>{fileRows.filter((row) => row.valid).length} số hợp lệ <span>/ {fileRows.length}</span></h2><p className="muted-copy">{fileRows.filter((row) => !row.valid).length ? `${fileRows.filter((row) => !row.valid).length} dòng không hợp lệ được giữ lại để kiểm tra.` : "Tất cả dòng đều sẵn sàng phân tích."}</p></div><button className="primary-button" onClick={analyzeAll}>Phân tích tất cả <BarChart3 size={16} /></button></div>}
        {ranked.length > 0 && <section className="panel ranking-panel">
          <div className="ranking-head"><div><p className="eyebrow">Bảng xếp hạng deterministic</p><h2>Top số nổi bật</h2></div><div className="export-actions"><button onClick={downloadCsv}><Download size={15} /> CSV</button><button onClick={downloadExcel}><Download size={15} /> Excel</button></div></div>
          <div className="toolbar"><div className="filter-scroll"><Filter size={15} />{(["all", "finance", "career", "love", "opportunity", "leadership", "saving", "best"] as FilterKey[]).map((key) => <button key={key} className={filter === key ? "selected" : ""} onClick={() => setFilter(key)}>{({ all: "Tất cả", finance: "Tài chính", career: "Nghề nghiệp", love: "Tình cảm", opportunity: "Cơ hội", leadership: "Lãnh đạo", saving: "Giữ tiền", best: "Điểm cao nhất" } as Record<FilterKey, string>)[key]}</button>)}</div><label className="sort-select"><ArrowDownIcon /> <select value={sort} onChange={(event) => setSort(event.target.value as RankingSort)}><option value="score-desc">Điểm cao → thấp</option><option value="score-asc">Điểm thấp → cao</option><option value="sum">Tổng số</option><option value="phone">Số điện thoại</option></select></label></div>
          <RankingTable rows={sortedVisibleRows.slice(0, 10)} onSelect={setSelected} sort={sort} onSort={setSort} showSource={Object.keys(sourceRecords).length > 0} />
          <p className="table-footnote">Đang hiển thị {Math.min(sortedVisibleRows.length, 10)} / {sortedVisibleRows.length} kết quả sau bộ lọc. Click một dòng để xem chi tiết.</p>
        </section>}
      </section>}

      <footer><span>PHONE MEANING ANALYZER</span><span>© 2026 · Dữ liệu theo bảng người dùng cung cấp</span></footer>
      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}>
        <div ref={detailModalRef} className="detail-modal" tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Chi tiết số ${selected.analysis.phoneNumber}`} onClick={(event) => event.stopPropagation()}>
          <div className="modal-toolbar">
            <div className="modal-navigation" role="group" aria-label="Điều hướng danh sách số">
              <button
                className="modal-nav-button"
                onClick={goToPrevious}
                disabled={!canGoPrevious}
                title="Số trước (←)"
                aria-label="Xem số trước"
              >
                <ArrowLeft size={16} />
                <span>Trước</span>
              </button>
              <span className="modal-position" aria-live="polite">
                {selectedIndex >= 0 ? `${selectedIndex + 1} / ${detailRows.length}` : "—"}
              </span>
              <button
                className="modal-nav-button"
                onClick={goToNext}
                disabled={!canGoNext}
                title="Số sau (→)"
                aria-label="Xem số sau"
              >
                <span>Sau</span>
                <ArrowRight size={16} />
              </button>
            </div>
            <span className="modal-keyboard-hint">← → để chuyển · Esc để đóng</span>
          </div>
          <button ref={modalCloseRef} className="modal-close" onClick={() => setSelected(null)} aria-label="Đóng chi tiết" title="Đóng (Esc)"><X size={18} /></button>
          <PhoneAnalysisView key={`${selected.analysis.phoneNumber}-${selected.rank}`} analysis={selected.analysis} source={selected.source} />
        </div>
      </div>}
    </main>
  );
}

function ArrowDownIcon() { return <ChevronDown size={15} />; }
