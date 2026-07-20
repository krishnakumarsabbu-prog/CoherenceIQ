import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { useTheme } from "@/providers/ThemeProvider";

interface ChartProps {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  onEvents?: Record<string, (params: any) => void>;
}

export function EChart({ option, className, style, onEvents }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    return () => chart.dispose();
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption({ ...baseOption(theme === "dark"), ...option }, { notMerge: false, lazyUpdate: true });
  }, [option, theme]);

  useEffect(() => {
    if (!chartRef.current || !onEvents) return;
    Object.entries(onEvents).forEach(([evt, fn]) => chartRef.current?.on(evt, fn));
    return () => Object.keys(onEvents).forEach((evt) => chartRef.current?.off(evt));
  }, [onEvents]);

  useEffect(() => {
    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}

function baseOption(dark: boolean) {
  const fg = dark ? "hsl(210, 40%, 96%)" : "hsl(222, 47%, 11%)";
  const muted = dark ? "hsl(215, 20%, 60%)" : "hsl(215, 16%, 47%)";
  const grid = dark ? "hsl(217, 33%, 16%)" : "hsl(214, 32%, 91%)";
  return {
    textStyle: { color: fg, fontFamily: "Inter, system-ui, sans-serif", fontSize: 11 },
    color: ["hsl(199, 89%, 52%)", "hsl(142, 71%, 48%)", "hsl(38, 92%, 54%)", "hsl(0, 72%, 56%)", "hsl(262, 83%, 62%)"],
    tooltip: {
      backgroundColor: dark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderColor: grid,
      borderWidth: 1,
      textStyle: { color: fg, fontSize: 11.5 },
      extraCssText: "border-radius: 8px; backdrop-filter: blur(8px); box-shadow: 0 8px 24px -8px rgba(0,0,0,0.4);",
    },
    legend: { textStyle: { color: muted, fontSize: 11 }, icon: "roundRect", itemWidth: 10, itemHeight: 10 },
    grid: { left: 48, right: 18, top: 32, bottom: 32, containLabel: true },
    xAxis: {
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: muted, fontSize: 10.5 },
      splitLine: { lineStyle: { color: grid, type: "dashed", opacity: 0.4 } },
    },
    yAxis: {
      axisLine: { show: false },
      axisLabel: { color: muted, fontSize: 10.5 },
      splitLine: { lineStyle: { color: grid, type: "dashed", opacity: 0.35 } },
    },
  } as EChartsOption;
}
