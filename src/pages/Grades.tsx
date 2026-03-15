import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem, MotionCard } from "../components/MotionCard";
import { GradesSkeleton } from "../components/Skeleton";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ChevronDown, FileText, Table2, User, ChevronRight } from "lucide-react";
import { clearPortalClientState } from "../lib/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScoreCell {
  value: string;
  bgColor: string;
  textColor: string;
}

interface SubjectRow {
  subject: string;
  clazz: string;
  teacher: string;
  scores: Record<string, ScoreCell | null>;
}

interface ParsedMarksheet {
  periodLabel: string;
  assessmentColumns: string[];
  subjects: SubjectRow[];
  footerAverages: Record<string, string>;
}

// ─── HTML Parser ─────────────────────────────────────────────────────────────

function parseMarksheetHtml(htmlStr: string): ParsedMarksheet | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlStr, 'text/html');

  const namesTable = doc.querySelector('#ctl01_gvNames') || doc.querySelector('.reportCommentNameGrid');
  const dataTable = doc.querySelector('#ctl01_gvMarksheet') || doc.querySelector('.reportCommentGrid');

  if (!namesTable && !dataTable) {
    const tables = Array.from(doc.querySelectorAll('table'));
    const big = tables.sort((a, b) => b.querySelectorAll('tr').length - a.querySelectorAll('tr').length)[0];
    if (!big) return null;
    return parseSingleTable(big);
  }

  let periodLabel = '';
  const subHeader = dataTable?.querySelector('tr.subHeader th span');
  if (subHeader) {
    periodLabel = subHeader.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  const assessmentColumns: string[] = [];
  const dataRows = dataTable ? Array.from(dataTable.querySelectorAll('tr')) : [];

  let colHeaderRow: Element | null = null;
  for (const tr of dataRows) {
    if (tr.classList.contains('subHeader')) continue;
    const ths = tr.querySelectorAll('th');
    if (ths.length > 2) {
      colHeaderRow = tr;
      break;
    }
  }

  if (colHeaderRow) {
    const ths = Array.from(colHeaderRow.querySelectorAll('th'));
    for (const th of ths) {
      const span = th.querySelector('.js-rotatedMarksheetHeaderDiv span, span');
      const name = span?.textContent?.trim() || th.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (name) assessmentColumns.push(name);
    }
  }

  const nameRows = namesTable ? Array.from(namesTable.querySelectorAll('tr')).filter(
    tr => !tr.querySelector('th') && !tr.classList.contains('marksheetFooter')
  ) : [];

  const scoreRows = dataRows.filter(
    tr => (tr.classList.contains('odd') || tr.classList.contains('even')) && !tr.classList.contains('marksheetFooter')
  );

  const subjects: SubjectRow[] = [];
  const count = Math.max(nameRows.length, scoreRows.length);

  for (let i = 0; i < count; i++) {
    let subject = '', clazz = '', teacher = '';
    if (nameRows[i]) {
      const tds = Array.from(nameRows[i].querySelectorAll('td'));
      subject = cleanCellText(tds[0]);
      clazz = cleanCellText(tds[2]);
      teacher = cleanCellText(tds[3]);
    }

    const scores: Record<string, ScoreCell | null> = {};
    if (scoreRows[i]) {
      const tds = Array.from(scoreRows[i].querySelectorAll('td'));
      tds.forEach((td, j) => {
        if (j >= assessmentColumns.length) return;
        const colName = assessmentColumns[j];
        const cellDiv = td.querySelector('.reportCommentGridCell');
        if (cellDiv) {
          const style = (cellDiv as HTMLElement).getAttribute('style') || '';
          const bgMatch = style.match(/background-color:\s*([^;]+)/i);
          const textMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
          scores[colName] = {
            value: cellDiv.textContent?.trim() || '',
            bgColor: bgMatch ? bgMatch[1].trim() : '#E5E5EA',
            textColor: textMatch ? textMatch[1].trim() : '#1D1D1F',
          };
        } else {
          scores[colName] = null;
        }
      });
    }

    subjects.push({ subject, clazz, teacher, scores });
  }

  const footerAverages: Record<string, string> = {};
  const footerRow = dataRows.find(tr => tr.classList.contains('marksheetFooter'));
  if (footerRow) {
    const tds = Array.from(footerRow.querySelectorAll('td'));
    tds.forEach((td, j) => {
      if (j < assessmentColumns.length) {
        const val = td.textContent?.trim() || '';
        if (val) footerAverages[assessmentColumns[j]] = val;
      }
    });
  }

  if (!subjects.length) return null;
  return { periodLabel, assessmentColumns, subjects, footerAverages };
}

function cleanCellText(el: Element | undefined): string {
  if (!el) return '';
  let text = el.innerHTML
    .replace(/&nbsp;/g, ' ')
    .replace(/<em>/g, '(')
    .replace(/<\/em>/g, ')');
  const tmp = document.createElement('div');
  tmp.innerHTML = text;
  return tmp.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function parseSingleTable(table: Element): ParsedMarksheet | null {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return null;

  const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
  const headers = headerCells.map(c => c.textContent?.replace(/\s+/g, ' ').trim() || '').filter(Boolean);

  const subjects: SubjectRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('td'));
    if (!cells.length) continue;
    const subject = cells[0]?.textContent?.trim() || '';
    if (!subject) continue;
    subjects.push({ subject, clazz: '', teacher: '', scores: {} });
  }

  return { periodLabel: '', assessmentColumns: headers, subjects, footerAverages: {} };
}

// ─── Color Utilities ─────────────────────────────────────────────────────────

function mapScoreColor(bgColor: string): { bg: string; text: string; ring: string } {
  const c = bgColor.toLowerCase();
  if (c === '#008c00') return { bg: 'bg-emerald-500', text: 'text-white', ring: '' };
  if (c === '#0000ff' || c === '#2b5c9e') return { bg: 'bg-blue-500', text: 'text-white', ring: '' };
  if (c === '#7c7c7c' || c === '#676767') return { bg: 'bg-zinc-500', text: 'text-white', ring: '' };
  if (c === '#e4c801') return { bg: 'bg-amber-400', text: 'text-amber-950', ring: '' };
  if (c === '#d76b00') return { bg: 'bg-orange-500', text: 'text-white', ring: '' };
  if (c === '#9f4244') return { bg: 'bg-red-500', text: 'text-white', ring: '' };
  if (c === '#d3d3d3') return { bg: 'bg-zinc-200', text: 'text-zinc-700', ring: '' };
  if (c === '#90ee90') return { bg: 'bg-emerald-200', text: 'text-emerald-800', ring: '' };
  return { bg: 'bg-zinc-100', text: 'text-zinc-700', ring: 'ring-1 ring-zinc-200' };
}

// ─── Main Component ──────────────────────────────────────────────────────────

const REDIRECT_ERROR = '__REDIRECT__';

export default function Grades() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pupilId, setPupilId] = useState('');
  
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  
  const [reportingPeriods, setReportingPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loadingPeriods, setLoadingPeriods] = useState(false);

  const [showDetails, setShowDetails] = useState(false);
  const [marksheet, setMarksheet] = useState<ParsedMarksheet | null>(null);
  const [loadingMarksheet, setLoadingMarksheet] = useState(false);

  const handle401 = (_action?: string) => {
    clearPortalClientState();
    navigate('/', { replace: true });
    throw new Error(REDIRECT_ERROR);
  };

  const fetchApi = async (action: string, context: any, signal?: AbortSignal) => {
    const res = await fetch(`/api/report-services/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ context }),
      signal,
    });
    if (res.status === 401) handle401(action);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.d ?? data;
  };

  useEffect(() => {
    const ctrl = new AbortController();
    const { signal } = ctrl;

    (async () => {
      try {
        setLoading(true);
        const idRes = await fetch('/api/pupil-id', { credentials: 'include', signal });
        if (signal.aborted) return;
        if (idRes.status === 401) handle401('pupil-id');
        if (!idRes.ok) throw new Error('Failed to fetch Pupil ID');
        const idData = await idRes.json();
        setPupilId(idData.pupilId);

        const years = await fetchApi('GetMarksheetAcademicYears', { Text: '', NumberOfItems: 0 }, signal);
        if (signal.aborted) return;
        setAcademicYears(years);
        if (years.length > 0) setSelectedYear(years[0].Value);
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message === REDIRECT_ERROR) return;
        setError(err.message);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  useEffect(() => {
      if (!selectedYear) return;
    const ctrl = new AbortController();
    const { signal } = ctrl;

    (async () => {
      try {
        setLoadingPeriods(true);
        const periods = await fetchApi('GetReportingPeriods', { Text: '', NumberOfItems: 0, academicYears: selectedYear }, signal);
        if (signal.aborted) return;
        setReportingPeriods(periods);
        if (periods.length > 0) {
          const def = periods.find((p: any) => p.Attributes?.Checked) || periods[0];
          setSelectedPeriod(def.Value);
        } else {
          setSelectedPeriod('');
          setMarksheet(null);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message === REDIRECT_ERROR) return;
        setError(err.message);
      } finally {
        if (!signal.aborted) setLoadingPeriods(false);
      }
    })();

    return () => ctrl.abort();
  }, [selectedYear]);

  useEffect(() => {
      if (!selectedYear || !selectedPeriod || !pupilId) return;
    if (!selectedPeriod.includes(selectedYear)) return;
      
    const ctrl = new AbortController();
    const { signal } = ctrl;

    (async () => {
      try {
        setLoadingMarksheet(true);
        setError(null); 

        const periodShort = selectedPeriod.split('|').pop() || selectedPeriod;

        const yearGroups = await fetchApi('GetYearGroups', { Text: '', NumberOfItems: 0, academicYears: selectedYear, reportingPeriods: periodShort }, signal);
        if (signal.aborted) return;
        const yearGroup = yearGroups[0]?.Value;
        if (!yearGroup) { setMarksheet(null); return; }

        const subjectsRes = await fetchApi('GetPupilMarksheetSubjects', { Text: '', NumberOfItems: 0, academicYears: selectedYear, reportingPeriods: selectedPeriod, yearGroups: yearGroup }, signal);
        if (signal.aborted) return;
        const subjectList = subjectsRes.map((s: any) => s.Value).join(',');

        const divisionsRes = await fetchApi('GetPupilMarksheetDivisions', { Text: '', NumberOfItems: 0, academicYears: selectedYear, reportingPeriods: periodShort, yearGroups: yearGroup, subjects: subjectList }, signal);
        if (signal.aborted) return;
        const divisionList = divisionsRes.map((d: any) => d.Value).join(',');

        const classesRes = await fetchApi('GetPupilMarksheetClasses', { Text: '', NumberOfItems: 0, academicYears: selectedYear, reportingPeriods: periodShort, yearGroups: yearGroup, subjects: subjectList, divisions: divisionList }, signal);
        if (signal.aborted) return;
        const batchList = classesRes.map((c: any) => c.Value).join(',');

        let columnList = '';
        if (showDetails) {
          try {
            const colsRes = await fetchApi('GetColumnsForSubjects', {
              Text: '', NumberOfItems: 0,
            academicYears: selectedYear, 
            reportingPeriods: selectedPeriod, 
            yearGroupList: yearGroup, 
            subjectList: subjectList, 
            divisionList: divisionList, 
              batchList: batchList,
            }, signal);
            if (signal.aborted) return;
            columnList = (colsRes || []).map((c: any) => c.Value).join(',');
          } catch { /* proceed without */ }
        }

        const res = await fetch('/api/report-services/RenderPupilMarksheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
          academicYear: selectedYear,
          reportingPeriodList: selectedPeriod,
          yearGroupList: yearGroup,
          subjectList: subjectList,
          divisionList: divisionList,
          batchList: batchList,
          columnList: columnList,
          pupilIDs: pupilId,
            uniqueID: 'Portal_PupilDetails',
          setAsPreference: true,
            defaultReportingPeriod: '',
            pageIndex: '0',
            sortField: 'Surname',
            sortDirection: 'ASC',
          sortable: true,
          showPupilName: false,
            allowCollapseMarksheetColumns: 'true',
          enableFrozenHeadings: false,
          filterSearch: true,
          page: 1,
            pageSize: 500,
          }),
          signal,
        });
        if (signal.aborted) return;
        if (res.status === 401) handle401();
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const upstreamMsg = errBody?.Message || errBody?.error || `HTTP ${res.status}`;
          throw new Error(upstreamMsg);
        }

        const raw = await res.json();
        let htmlStr = raw.d ?? raw;
        if (typeof htmlStr !== 'string') htmlStr = JSON.stringify(htmlStr);

        setMarksheet(parseMarksheetHtml(htmlStr));
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message === REDIRECT_ERROR) return;
        console.error('Marksheet error:', err);
        setError(err.message);
      } finally {
        if (!signal.aborted) setLoadingMarksheet(false);
      }
    })();
    
    return () => ctrl.abort();
  }, [selectedPeriod, selectedYear, pupilId, showDetails]);

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-[1400px] mx-auto space-y-6 pb-16">
          <div className="space-y-2">
            <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-4 w-48 rounded-lg animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
          </div>
          <GradesSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !marksheet) {
    return (
      <PageTransition>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="p-4 rounded-2xl flex items-center gap-3 font-medium text-[14px] border"
          style={{ background: "rgba(255,59,48,0.08)", color: "var(--danger)", borderColor: "rgba(255,59,48,0.15)" }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <StaggerContainer className="max-w-[1400px] mx-auto space-y-6 pb-16">
        {/* Header */}
        <StaggerItem>
          <div className="pt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
              <h1 className="text-[32px] leading-tight font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>成绩</h1>
              <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>您的学术表现和评估。</p>
            </div>
            <motion.button
              onClick={() => setShowDetails(v => !v)}
              disabled={loadingPeriods || loadingMarksheet}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed border"
              style={{
                background: showDetails ? "var(--accent)" : "var(--bg-primary)",
                color: showDetails ? "#fff" : "var(--text-primary)",
                borderColor: showDetails ? "var(--accent)" : "var(--border-strong)",
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Table2 className="w-4 h-4" />
              {showDetails ? '隐藏详细视图' : '显示详细评估'}
            </motion.button>
          </div>
        </StaggerItem>

        {/* Filters */}
        <StaggerItem>
          <div className="p-1.5 rounded-2xl flex flex-col sm:flex-row gap-1.5" style={{ background: "var(--bg-secondary)" }}>
            <FilterSelect
              value={selectedYear}
              onChange={setSelectedYear}
              disabled={loadingPeriods || loadingMarksheet}
              options={academicYears.map(y => ({ value: y.Value, label: y.Text }))}
            />
            <FilterSelect
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              disabled={loadingPeriods || loadingMarksheet}
              options={loadingPeriods ? [{ value: '', label: 'Loading…' }] : reportingPeriods.map(p => ({ value: p.Value, label: p.Text }))}
            />
          </div>
        </StaggerItem>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loadingMarksheet ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GradesSkeleton />
            </motion.div>
          ) : marksheet && marksheet.subjects.length > 0 ? (
            <motion.div
              key={showDetails ? "detailed" : "card"}
              initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              {showDetails ? (
                <DetailedView marksheet={marksheet} />
              ) : (
                <CardView marksheet={marksheet} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <EmptyState />
            </motion.div>
          )}
        </AnimatePresence>
      </StaggerContainer>
    </PageTransition>
  );
}

// ─── Filter Select ───────────────────────────────────────────────────────────

function FilterSelect({ value, onChange, disabled, options }: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative flex-1">
      <select
        className="w-full appearance-none border-none rounded-xl py-3 pl-4 pr-9 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)", boxShadow: "var(--card-shadow)" }}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
            </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-3xl border py-32 text-center" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--bg-secondary)" }}>
        <FileText className="w-7 h-7" style={{ color: "var(--text-tertiary)" }} />
      </div>
      <h3 className="text-[17px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No Data Found</h3>
      <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>There is no data available for this reporting period.</p>
    </div>
  );
}

// ─── Card View ───────────────────────────────────────────────────────────────

function CardView({ marksheet }: { marksheet: ParsedMarksheet }) {
  const keyColumns = marksheet.assessmentColumns.filter(c => {
    const l = c.toLowerCase();
    return l.includes('target') || l.includes('quarter grade') || l.includes('overall') || l.includes('seminar grade');
  });
  const displayColumns = keyColumns.length > 0 ? keyColumns : marksheet.assessmentColumns.slice(0, 3);

  return (
    <div className="space-y-3">
      {marksheet.subjects.map((sub, i) => {
        const hasAnyScore = Object.values(sub.scores).some(s => s !== null);
        if (!sub.subject && !hasAnyScore) return null;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 24 }}
            className="rounded-2xl border px-5 py-4 transition-shadow duration-300"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--card-shadow-hover)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "var(--card-shadow)")}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold leading-snug truncate" style={{ color: "var(--text-primary)" }}>
                  {sub.subject || '—'}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  {sub.teacher && (
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{sub.teacher}</span>
                  )}
                  {sub.clazz && <span>{sub.clazz}</span>}
          </div>
        </div>

              <div className="flex flex-wrap items-start gap-2 flex-shrink-0">
                {displayColumns.map(col => {
                  const cell = sub.scores[col];
                  if (!cell) return null;
                  const colors = mapScoreColor(cell.bgColor);
                  return (
                    <div key={col} className="text-center min-w-0 max-w-[140px]">
                      <motion.div
                        className={`inline-flex items-center justify-center min-w-[40px] h-[34px] px-2.5 rounded-lg text-[14px] font-bold tabular-nums ${colors.bg} ${colors.text} ${colors.ring}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.03, type: "spring", stiffness: 400, damping: 20 }}
                      >
                        {cell.value}
                      </motion.div>
                      <p className="text-[10px] mt-1 leading-tight break-words whitespace-normal text-center" style={{ color: "var(--text-tertiary)" }}>{col}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Detailed View ───────────────────────────────────────────────────────────

function DetailedView({ marksheet }: { marksheet: ParsedMarksheet }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {marksheet.periodLabel && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            {marksheet.periodLabel}
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            · {marksheet.assessmentColumns.length} assessment columns
          </span>
        </div>
      )}

      {marksheet.subjects.map((sub, i) => {
        const hasAnyScore = Object.values(sub.scores).some(s => s !== null);
        if (!sub.subject && !hasAnyScore) return null;

        const filledScores = marksheet.assessmentColumns
          .map(col => ({ col, cell: sub.scores[col] }))
          .filter(s => s.cell !== null) as { col: string; cell: ScoreCell }[];

        const isExpanded = expandedIdx === i;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 24 }}
            className="rounded-2xl border overflow-hidden transition-shadow duration-300"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--card-shadow-hover)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "var(--card-shadow)")}
          >
            <button
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
              </motion.div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold leading-snug truncate" style={{ color: "var(--text-primary)" }}>
                  {sub.subject || '—'}
                </h3>
                <div className="flex items-center gap-3 mt-0.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  {sub.teacher && (
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{sub.teacher}</span>
                  )}
                  {sub.clazz && <span>{sub.clazz}</span>}
                </div>
              </div>

              {!isExpanded && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {filledScores.slice(0, 5).map(({ col, cell }) => {
                    const colors = mapScoreColor(cell.bgColor);
                    return (
                      <span
                        key={col}
                        title={`${col}: ${cell.value}`}
                        className={`inline-flex items-center justify-center min-w-[32px] h-[26px] px-1.5 rounded-md text-[12px] font-bold tabular-nums ${colors.bg} ${colors.text} ${colors.ring}`}
                      >
                        {cell.value}
                      </span>
                    );
                  })}
                  {filledScores.length > 5 && (
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>+{filledScores.length - 5}</span>
                  )}
                </div>
              )}
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && filledScores.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 pt-0">
                    <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)" }}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {filledScores.map(({ col, cell }, j) => {
                          const colors = mapScoreColor(cell.bgColor);
                          return (
                            <motion.div
                              key={col}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: j * 0.03, type: "spring", stiffness: 300, damping: 24 }}
                              className="flex items-start gap-2.5 min-w-0"
                            >
                              <span className={`flex-shrink-0 inline-flex items-center justify-center min-w-[40px] h-[34px] px-2.5 rounded-lg text-[14px] font-bold tabular-nums ${colors.bg} ${colors.text} ${colors.ring}`}>
                                {cell.value}
                                </span>
                              <span className="text-[12px] leading-tight break-words whitespace-normal min-w-0 flex-1" style={{ color: "var(--text-secondary)" }}>
                                {col}
                                </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isExpanded && filledScores.length === 0 && (
              <div className="px-5 pb-4">
                <p className="text-[12px] italic" style={{ color: "var(--text-tertiary)" }}>No scores available for this subject.</p>
              </div>
            )}
          </motion.div>
                    );
                  })}

      {Object.keys(marksheet.footerAverages).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 24 }}
          className="rounded-2xl px-5 py-4"
          style={{ background: "var(--bg-secondary)" }}
        >
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>Averages</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(marksheet.footerAverages).map(([col, val]) => (
              <div key={col} className="flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 min-w-0 max-w-[280px]" style={{ background: "var(--bg-primary)", boxShadow: "var(--card-shadow)" }}>
                <span className="text-[13px] font-bold tabular-nums flex-shrink-0" style={{ color: "var(--text-primary)" }}>{val}</span>
                <span className="text-[10px] break-words whitespace-normal min-w-0" style={{ color: "var(--text-tertiary)" }}>{col}</span>
            </div>
            ))}
          </div>
        </motion.div>
        )}
      </div>
  );
}
