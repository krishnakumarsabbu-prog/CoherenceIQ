import type { EChartsOption } from "echarts";
import { EChart } from "./EChart";

interface AreaData { time: string[]; series: { name: string; data: number[]; color?: string }[] }

export function AreaChart({ data, height = 240 }: { data: AreaData; height?: number }) {
  const option: EChartsOption = {
    legend: { top: 0, right: 0 },
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    xAxis: { type: "category", boundaryGap: false, data: data.time },
    yAxis: { type: "value" },
    tooltip: { trigger: "axis" },
    series: data.series.map((s) => ({
      name: s.name,
      type: "line",
      smooth: true,
      symbol: "none",
      data: s.data,
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.18, color: s.color ?? "hsl(199 89% 52%)" },
      itemStyle: { color: s.color ?? "hsl(199 89% 52%)" },
      emphasis: { focus: "series" },
    })),
  };
  return <EChart option={option} style={{ height }} />;
}

interface BarData { categories: string[]; series: { name: string; data: number[]; color?: string }[]; horizontal?: boolean }

export function BarChart({ data, height = 240 }: { data: BarData; height?: number }) {
  const option: EChartsOption = {
    legend: { top: 0, right: 0 },
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: data.horizontal ? { type: "value" } : { type: "category", data: data.categories },
    yAxis: data.horizontal ? { type: "category", data: data.categories } : { type: "value" },
    series: data.series.map((s) => ({
      name: s.name,
      type: "bar",
      data: s.data,
      barWidth: "46%",
      itemStyle: { color: s.color ?? "hsl(199 89% 52%)", borderRadius: [4, 4, 0, 0] },
      emphasis: { itemStyle: { color: s.color ?? "hsl(199 89% 62%)" } },
    })),
  };
  return <EChart option={option} style={{ height }} />;
}

export function PieChart({ data, height = 240, doughnut = true }: { data: { name: string; value: number }[]; height?: number; doughnut?: boolean }) {
  const option: EChartsOption = {
    legend: { bottom: 0, icon: "circle", textStyle: { fontSize: 11 } },
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: doughnut ? ["52%", "78%"] : "72%",
        center: ["50%", "46%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: "hsl(222 44% 8%)", borderWidth: 3, borderRadius: 4 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 600 }, scaleSize: 6 },
        data,
      },
    ],
  };
  return <EChart option={option} style={{ height }} />;
}

export function HeatmapChart({ data, height = 240 }: { data: { hour: number; day: number; value: number }[]; height?: number }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => `${i}h`);
  const option: EChartsOption = {
    tooltip: { position: "top", formatter: (p: any) => `${days[p.value[1]]} ${hours[p.value[0]]}<br/>Sessions: <b>${p.value[2]}</b>` },
    grid: { left: 36, right: 12, top: 12, bottom: 36, containLabel: true },
    xAxis: { type: "category", data: hours, splitArea: { show: false }, axisLabel: { interval: 2 } },
    yAxis: { type: "category", data: days, splitArea: { show: false } },
    visualMap: {
      min: 0, max: 100, calculable: false, orient: "horizontal", left: "center", bottom: 0,
      itemWidth: 12, itemHeight: 90,
      inRange: { color: ["hsl(217 33% 14%)", "hsl(199 89% 42%)", "hsl(199 89% 62%)", "hsl(142 71% 55%)"] },
      textStyle: { fontSize: 10 },
    },
    series: [
      {
        type: "heatmap", data: data.map((d) => [d.hour, d.day, d.value]),
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "hsl(199 89% 52% / 0.5)" } },
        progressive: 1000, animation: false,
        itemStyle: { borderRadius: 2 },
      },
    ],
  };
  return <EChart option={option} style={{ height }} />;
}

export function GaugeChart({ value, label, height = 160, color = "hsl(199 89% 52%)" }: { value: number; label: string; height?: number; color?: string }) {
  const option: EChartsOption = {
    series: [
      {
        type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100,
        radius: "92%", center: ["50%", "60%"],
        progress: { show: true, width: 10, roundCap: true, itemStyle: { color } },
        axisLine: { lineStyle: { width: 10, color: [[1, "hsl(217 33% 16%)"]] } },
        pointer: { show: false },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        anchor: { show: false },
        detail: { valueAnimation: true, fontSize: 26, fontWeight: 700, offsetCenter: [0, 0], formatter: "{value}", color },
        title: { offsetCenter: [0, "32%"], fontSize: 11, color: "hsl(215 20% 60%)" },
        data: [{ value, name: label }],
      },
    ],
  };
  return <EChart option={option} style={{ height }} />;
}

export function CountryMapChart({ data, height = 260 }: { data: { code: string; name: string; value: number; risk: number }[]; height?: number }) {
  const top = [...data].sort((a, b) => b.value - a.value).slice(0, 14);
  const option: EChartsOption = {
    tooltip: {
      trigger: "item",
      formatter: (p: any) => `${p.data?.name ?? p.name}<br/>Sessions: <b>${p.data?.value ?? 0}</b><br/>Avg Risk: <b>${p.data?.risk ?? 0}</b>`,
    },
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: "value", show: false, max: Math.max(...top.map((t) => t.value)) * 1.2 },
    yAxis: {
      type: "category",
      data: top.map((t) => t.name).reverse(),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: "bar", barWidth: 14, barGap: 2,
        data: top.map((t) => ({ value: t.value, name: t.name, risk: t.risk })).reverse(),
        itemStyle: { borderRadius: [0, 6, 6, 0], color: (p: any) =>
          p.data.risk >= 60 ? "hsl(0 72% 56%)" : p.data.risk >= 40 ? "hsl(38 92% 54%)" : "hsl(142 71% 48%)"
        },
        label: { show: true, position: "right", formatter: (p: any) => `${p.value}`, fontSize: 10.5, color: "hsl(215 20% 60%)" },
      },
    ],
  };
  return <EChart option={option} style={{ height }} />;
}

export function TrendLineChart({ time, series, height = 220 }: { time: string[]; series: { name: string; data: number[]; color?: string }[]; height?: number }) {
  const option: EChartsOption = {
    legend: { top: 0, right: 0, textStyle: { fontSize: 10.5 } },
    grid: { left: 8, right: 8, top: 36, bottom: 24, containLabel: true },
    xAxis: { type: "category", boundaryGap: false, data: time },
    yAxis: { type: "value" },
    tooltip: { trigger: "axis" },
    series: series.map((s) => ({
      name: s.name, type: "line", smooth: true, symbol: "circle", symbolSize: 5, showSymbol: false,
      data: s.data, lineStyle: { width: 2.2 }, itemStyle: { color: s.color },
      emphasis: { focus: "series" },
    })),
  };
  return <EChart option={option} style={{ height }} />;
}

export function StackedAreaChart({ time, series, height = 260 }: { time: string[]; series: { name: string; data: number[]; color?: string }[]; height?: number }) {
  const palette = ["hsl(142 71% 48%)", "hsl(38 92% 54%)", "hsl(0 72% 56%)"];
  const option: EChartsOption = {
    legend: { top: 0, right: 0, textStyle: { fontSize: 10.5 } },
    grid: { left: 8, right: 12, top: 36, bottom: 24, containLabel: true },
    xAxis: { type: "category", boundaryGap: false, data: time },
    yAxis: { type: "value" },
    tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
    series: series.map((s, i) => ({
      name: s.name, type: "line", stack: "total", smooth: true, symbol: "none",
      data: s.data, lineStyle: { width: 1.5 }, itemStyle: { color: s.color ?? palette[i] },
      areaStyle: { opacity: 0.55, color: s.color ?? palette[i] },
      emphasis: { focus: "series" },
    })),
  };
  return <EChart option={option} style={{ height }} />;
}
