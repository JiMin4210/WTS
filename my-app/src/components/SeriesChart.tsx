import type { Point, Tab } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export function SeriesChart(props: {
  points: Point[];
  tab: Tab;
  dayDate: string;        // "YYYY-MM-DD"
  monthYearMonth: string; // "YYYY-MM"
  year: string;           // "YYYY"
}) {
  const { points, tab, dayDate, monthYearMonth, year } = props;

  // 1) points → "2자리 키"로 정규화해서 Map 저장
  const map = new Map<string, number>();
  for (const p of points ?? []) {
    const key = normalizeKey(p.x);
    const y = typeof p.y === "number" ? p.y : Number(p.y ?? 0);
    map.set(key, Number.isFinite(y) ? y : 0);
  }

  // 2) 탭별 전체 구간 생성(빈 구간 0 채움)
  const data = buildFilledData(tab, { dayDate, monthYearMonth, year }, map);
  if (!data || data.length === 0) {
    return (
      <div style={{ color: "#666" }}>
        데이터가 없거나 아직 디바이스/탭이 선택되지 않았습니다.
      </div>
    );
  }

  // 3) 축 설명(차트 위에 작은 글씨로 표시)
  const axisInfo = getAxisInfo(tab);

  // 4) Tooltip 라벨(사람이 읽기 좋게)
  const tooltipLabel = (xKey: string) => {
    if (tab === "day") return `${dayDate} ${xKey}시`;
    if (tab === "month") return `${monthYearMonth}-${xKey}`;
    return `${year}-${xKey}`;
  };

  // 5) ✅ 탭별 “답답함 해소 프리셋”
  const preset = getPreset(tab);

  // 6) ✅ X축 라벨 스킵(너무 촘촘하면 자동 생략)
  const xInterval = calcTickInterval(tab, data.length);

  // 7) ✅ X축 라벨 텍스트를 탭별로 더 직관적으로
  // - month: "01" -> "1" (일자)
  // - year:  "01" -> "1" (월)
  const tickFormatter = (v: any) => {
    const s = String(v);
    if (tab === "day") return s; // 00~23 유지
    // month/year는 사람이 01보다 1이 더 빨리 읽음
    const n = Number(s);
    return Number.isFinite(n) ? String(n) : s;
  };

  // ✅ 값 라벨(막대 위 숫자) 표시 여부
  // - 화면 크기와 무관하게 "데이터 밀도"로 판단해서 겹침을 줄임
  // 의미: 전체 데이터 중에서 값이 0보다 큰 데이터의 개수만 셉니다
  // 이유: 값이 0인 곳은 막대가 그려지지 않으므로 숫자 라벨도 생기지 않습니다. 즉, 실제로 화면에 그려질 "의미 있는 데이터의 밀도"를 측정하는 것입니다.
  const nonZeroCount = data.filter((d) => (d?.y ?? 0) > 0).length;
  const showValueLabels = tab === "day" ? nonZeroCount <= 10 : tab === "month" ? nonZeroCount <= 8 : nonZeroCount <= 12;

  return (
    <div style={{ width: "100%", height: 360 }}>
      {/* ✅ 축 제목은 축 옆이 아니라 "상단 작은 글씨"로 표시해서 가로 공간을 확보 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 0,
          color: "#6b7280",
          fontSize: 12,
        }}
      >
        <span>{axisInfo.yLabel}</span>
        <span>{axisInfo.xLabel}</span>
      </div>

      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={preset.margin}
          barCategoryGap={preset.barCategoryGap}
          barGap={preset.barGap}
        >
          <CartesianGrid strokeDasharray="3 3" />

          {/* ✅ X축: 좌/우 padding으로 "왼쪽에 붙는 느낌" 제거 */}
          <XAxis
            dataKey="x"
            interval={xInterval}
            padding={preset.xPadding}
            tickFormatter={tickFormatter}
            height={22}
            tickMargin={10}
            tick={{ fontSize: 13 }}
          />

          {/* ✅ Y축: 생산량 라벨(왼쪽) + 위쪽 짤림 방지 여유는 margin.top에서 */}
          <YAxis
            allowDecimals={false}
            tickMargin={6}
            width={28}
            tick={{ fontSize: 13 }}
          />

          {/* ✅ 툴팁 수정부: 가로 늘어남 방지 및 데스크탑 최적화 */}
          <Tooltip
            // 1. 핵심 해결책: 차트 영역(ViewBox) 밖으로 나가는 것을 금지하여 가로 스크롤 방지
            allowEscapeViewBox={{ x: false, y: false }}

            // 2. 상자 스타일: 콤팩트한 비율 유지
            contentStyle={{
              width: "115px",
              padding: "6px 10px",
              fontSize: "12px",
              borderRadius: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #d1d1d1",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.05)",
            }}

            // 3. 텍스트 및 제목 스타일
            itemStyle={{ fontSize: "12px", padding: "0px", margin: "0px", color: "#333" }}
            labelStyle={{ fontSize: "12px", fontWeight: "bold", marginBottom: "3px", color: "#000" }}

            // 4. 위치 디테일
            offset={12}
            cursor={{ fill: "rgba(0, 0, 0, 0.04)" }} // 마우스 오버 시 막대 배경

            wrapperStyle={{ zIndex: 1000, outline: 'none' }}
            labelFormatter={(label) => tooltipLabel(String(label))}
            formatter={(value) => [value, "생산량"]}
          />

          {/* ✅ 막대: 탭별 두께(barSize)로 답답함 해소 */}
          <Bar dataKey="y" isAnimationActive={false} barSize={preset.barSize}>
            {/* ✅ 값 라벨: 0은 숨김, 위쪽 짤림 방지를 위해 offset 조정 */}
            {showValueLabels ? (
              <LabelList
                dataKey="y"
                position="top"
                offset={6}
                formatter={hideZeroLabel}
                style={{ fontSize: 10, fill: "#666", fontWeight: 500 }}
              />
            ) : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}

/**
 * 탭별 “보기 좋은 프리셋”
 * 목표:
 * - 첫 막대가 y축에 붙지 않게(좌/우 padding)
 * - 막대가 너무 두껍지 않게(barSize)
 * - 카테고리 간격 충분히(barCategoryGap)
 * - 라벨/값이 위아래로 안 잘리게(margin)
 */
function getPreset(tab: Tab) {
  if (tab === "year") {
    return {
      // 연: 12개라 여유가 많음 → 막대 조금 두껍게, 간격 넉넉하게
      barSize: 5,
      barCategoryGap: "38%",
      barGap: 2,
      xPadding: { left: 12, right: 12 }, // 일, 월, 연 통일
      margin: { top: 28, right: 10, left: 10, bottom: 24 }, // 일, 월, 연 통일
    };
  }

  if (tab === "month") {
    // 월: 28~31개 → 막대 얇게 + 간격 많이 + 좌우 패딩 더 주기
    return {
      barSize: 5,
      barCategoryGap: "50%",
      barGap: 2,
      xPadding: { left: 12, right: 12 }, // 일, 월, 연 통일
      margin: { top: 28, right: 10, left: 10, bottom: 24 }, // 일, 월, 연 통일
    };
  }

  // day: 24개 → 월보단 덜 촘촘하지만 답답할 수 있음
  return {
    barSize: 5,
    barCategoryGap: "42%",
    barGap: 2,
    xPadding: { left: 12, right: 12 }, // 일, 월, 연 통일
    margin: { top: 28, right: 10, left: 10, bottom: 24 }, // 일, 월, 연 통일
  };
}

/**
 * 라벨 스킵(가독성)
 * - day(24): 모두 표시하면 빽빽 → 1~2 간격 스킵 추천
 * - month(28~31): 2~3 간격 스킵
 * - year(12): 전부 표시
 *
 * Recharts interval:
 * - 0: 모두 표시
 * - 1: 하나씩 건너뜀
 * - 2: 2개씩 건너뜀 ...
 */
function calcTickInterval(tab: Tab, count: number) {
  if (tab === "year") return 0;

  if (tab === "month") {
    if (count >= 31) return 2;
    if (count >= 28) return 2;
    if (count >= 20) return 1;
    return 0;
  }

  // day
  // 24개를 전부 표시하면 “00~23”이 촘촘하게 느껴질 수 있음
  // 2시간 간격 정도로 보이면 더 시원해짐
  return 1; // 0이면 전부, 1이면 2칸에 하나
}

function normalizeKey(x: string) {
  const s = String(x);
  // .replace(/\D/g, ""): 숫자가 아닌 것들을 찾아서 전부 빈 문자열("")로 바꿔라, 즉 "숫자만 남기고 다 지워라"라는 뜻
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 2) return digits.slice(-2);
  if (digits.length === 1) return `0${digits}`;
  return "00";
}

function buildFilledData(
  tab: Tab,
  ctx: { dayDate: string; monthYearMonth: string; year: string },
  map: Map<string, number>
) {
  if (tab === "day") {
    const arr = [];
    for (let h = 0; h < 24; h++) {
      const key = pad2(h);
      arr.push({ x: key, y: map.get(key) ?? 0 });
    }
    return arr;
  }

  if (tab === "month") {
    const days = daysInMonth(ctx.monthYearMonth);
    const arr = [];
    for (let d = 1; d <= days; d++) {
      const key = pad2(d);
      arr.push({ x: key, y: map.get(key) ?? 0 });
    }
    return arr;
  }

  const arr = [];
  for (let m = 1; m <= 12; m++) {
    const key = pad2(m);
    arr.push({ x: key, y: map.get(key) ?? 0 });
  }
  return arr;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(yearMonth: string) {
  const [yStr, mStr] = String(yearMonth).split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 31;
  return new Date(y, m, 0).getDate();
}

function hideZeroLabel(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "";
  return String(n);
}

function getAxisInfo(tab: Tab) {
  const yLabel = "생산량(개)";
  if (tab === "day") {
    return { xLabel: "시간(00~23)", yLabel };
  }
  if (tab === "month") {
    return { xLabel: "일(1~말일)", yLabel };
  }
  return { xLabel: "월(1~12)", yLabel };
}
