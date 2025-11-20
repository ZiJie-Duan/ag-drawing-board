"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { HexColorInput } from "react-colorful";
import { Brush, Eraser, Trash2, Pipette, Palette, Check, Sun, HelpCircle, Save, MonitorCheck, Smartphone } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { colord, extend, RgbColor } from "colord";
import namesPlugin from "colord/plugins/names";

extend([namesPlugin]);

// 工具函数：合并类名
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 类型定义
type Tool = "brush" | "eraser" | "picker";
type GridData = (string | null)[][];

interface SavedSlot {
  id: number;
  name: string;
  grid: GridData;
  lastModified: number;
}

// 常量
const GRID_SIZE = 8;
const MAX_HISTORY = 14;
const MAX_SLOTS = 10;

// 模拟数据库存储
const MOCK_DB_KEY = "angel_pixel_warmth_db";

export default function PixelArtPage() {
  // --- 状态 ---
  
  // 画板状态
  const [grid, setGrid] = useState<GridData>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  );
  const [slots, setSlots] = useState<SavedSlot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<number>(1);
  const [isDirty, setIsDirty] = useState(false);

  // 颜色与工具状态
  const [color, setColor] = useState("#FF9F43"); // 默认暖色
  const [tool, setTool] = useState<Tool>("brush");
  const [historyColors, setHistoryColors] = useState<string[]>([]);

  // UI 状态
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending'>('pending');

  // --- 初始化与副作用 ---

  // 初始化历史颜色
  useEffect(() => {
    setHistoryColors(["#FF9F43", "#FF6B6B", "#4ECDC4", "#1A535C", "#F7FFF7"]);
  }, []);

  // 模拟从数据库加载槽位数据
  useEffect(() => {
    const loadSlots = () => {
      try {
        const saved = localStorage.getItem(MOCK_DB_KEY);
        if (saved) {
          let parsed = JSON.parse(saved);
          
          // 检查是否需要补充槽位
          if (parsed.length < MAX_SLOTS) {
            const currentLength = parsed.length;
            const newSlots = Array.from({ length: MAX_SLOTS - currentLength }, (_, i) => ({
              id: currentLength + i + 1,
              name: `Slot ${currentLength + i + 1}`,
              grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)),
              lastModified: Date.now()
            }));
            parsed = [...parsed, ...newSlots];
            localStorage.setItem(MOCK_DB_KEY, JSON.stringify(parsed));
          }

          setSlots(parsed);
          // 加载第一个槽位的数据
          if (parsed.length > 0) {
            setGrid(parsed[0].grid);
          }
        } else {
          // 初始化默认槽位
          const initialSlots: SavedSlot[] = Array.from({ length: MAX_SLOTS }, (_, i) => ({
            id: i + 1,
            name: `Slot ${i + 1}`,
            grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)),
            lastModified: Date.now()
          }));
          setSlots(initialSlots);
          setGrid(initialSlots[0].grid);
          // 保存初始数据到 DB
          localStorage.setItem(MOCK_DB_KEY, JSON.stringify(initialSlots));
        }
      } catch (e) {
        console.error("Failed to load slots", e);
      }
    };
    loadSlots();
  }, []);

  // 未保存提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // --- 逻辑处理 ---

  // 绘图逻辑
  const handleCellClick = (row: number, col: number) => {
    if (tool === "picker") {
      const targetColor = grid[row][col];
      if (targetColor) {
        setColor(targetColor);
        setTool("brush");
      }
      return;
    }

    const newGrid = [...grid.map((r) => [...r])];
    
    if (tool === "eraser") {
      newGrid[row][col] = null;
    } else {
      newGrid[row][col] = color;
      addToHistory(color);
    }
    
    setGrid(newGrid);
    setIsDirty(true);
  };

  // 添加到历史记录
  const addToHistory = (newColor: string) => {
    setHistoryColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== newColor.toLowerCase());
      return [newColor, ...filtered].slice(0, MAX_HISTORY);
    });
  };

  // 清空画板
  const handleClear = () => {
    if (confirm("确定要清空当前画板吗？")) {
      setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
      setIsDirty(true);
    }
  };

  // 保存当前槽位
  const saveSlot = (slotId: number, gridData: GridData) => {
    const updatedSlots = slots.map(s => 
      s.id === slotId 
        ? { ...s, grid: gridData, lastModified: Date.now() } 
        : s
    );
    setSlots(updatedSlots);
    
    // MOCK DB CALL
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(updatedSlots));
    
    setIsDirty(false);
    console.log(`Saved slot ${slotId}`);
  };

  // 切换槽位
  const handleSlotChange = (newSlotId: number) => {
    if (currentSlotId === newSlotId) return;

    // 自动保存当前进度
    saveSlot(currentSlotId, grid);

    // 加载新槽位
    const targetSlot = slots.find(s => s.id === newSlotId);
    if (targetSlot) {
      setGrid(targetSlot.grid);
      setCurrentSlotId(newSlotId);
      setIsDirty(false);
    }
  };

  // 手动保存
  const handleManualSave = () => {
    saveSlot(currentSlotId, grid);
    // 可以加一个 Toast 提示
    alert("保存成功！");
  };

  // RGB 转换
  const rgb = colord(color).toRgb();
  
  const handleRgbChange = (key: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [key]: value };
    setColor(colord(newRgb).toHex());
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans selection:bg-orange-200 relative">
      
      {/* 顶部栏：状态与标题 */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border",
          syncStatus === 'synced' 
            ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
            : "bg-amber-50 text-amber-600 border-amber-200"
        )}>
          {syncStatus === 'synced' ? <MonitorCheck size={14} /> : <Smartphone size={14} />}
          {syncStatus === 'synced' ? "已同步" : "待同步"}
        </div>
        <button 
          onClick={() => setIsSyncModalOpen(true)}
          className="p-1.5 rounded-full bg-white text-stone-400 border border-stone-200 hover:text-orange-400 hover:border-orange-200 transition-colors shadow-sm"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      <header className="pt-12 pb-8 text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-4 text-orange-400 ring-4 ring-stone-100">
          <Palette size={32} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-stone-800">Angelʻs Pixel Warmth</h1>
        <p className="text-stone-500 font-medium">在 8x8 的小世界里，绘出你的温暖</p>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 flex flex-col gap-8 items-center mb-24">
        
        {/* 上部主要操作区 */}
        <div className="w-full flex flex-col lg:flex-row gap-8 justify-center items-start">
          {/* 左侧：画板区域 */}
          <div className="flex flex-col items-center gap-6 flex-1">
            <div 
              className="bg-white p-4 rounded-3xl shadow-2xl shadow-stone-200/50 ring-1 ring-stone-100 select-none"
              style={{ touchAction: 'none' }}
            >
              <div 
                className="grid gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200"
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
              >
                {grid.map((row, rowIndex) =>
                  row.map((cellColor, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      className={cn(
                        "w-10 h-10 sm:w-14 sm:h-14 rounded-lg transition-all duration-200 ease-out",
                        "hover:scale-95 active:scale-90 focus:outline-none",
                        "border border-transparent",
                        !cellColor && "bg-white hover:bg-stone-50",
                        tool === 'picker' && "cursor-crosshair hover:ring-2 hover:ring-orange-400"
                      )}
                      style={{ backgroundColor: cellColor || undefined }}
                      aria-label={`Cell ${rowIndex},${colIndex}`}
                    />
                  ))
                )}
              </div>
            </div>

            {/* 画板工具栏 */}
            <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-lg shadow-stone-200/40 ring-1 ring-stone-100">
              <ToolButton 
                active={tool === "brush"} 
                onClick={() => setTool("brush")} 
                icon={<Brush size={20} />}
                label="画笔"
              />
              <ToolButton 
                active={tool === "eraser"} 
                onClick={() => setTool("eraser")} 
                icon={<Eraser size={20} />}
                label="橡皮"
              />
              <div className="w-px h-8 bg-stone-200 mx-1" />
              <ToolButton 
                active={tool === "picker"} 
                onClick={() => setTool("picker")} 
                icon={<Pipette size={20} />}
                label="拾色"
              />
              <div className="w-px h-8 bg-stone-200 mx-1" />
              <button
                onClick={handleClear}
                className="p-3 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors tooltip-trigger group relative"
              >
                <Trash2 size={20} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  清空
                </span>
              </button>
              <div className="w-px h-8 bg-stone-200 mx-1" />
              <button
                onClick={handleManualSave}
                className={cn(
                  "p-3 rounded-xl transition-colors tooltip-trigger group relative",
                  isDirty ? "text-orange-500 bg-orange-50 hover:bg-orange-100" : "text-stone-400 hover:text-stone-600"
                )}
              >
                <Save size={20} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  保存
                </span>
              </button>
            </div>
          </div>

          {/* 右侧：颜色面板 */}
          <div className="flex flex-col gap-6 w-full max-w-md">
            
            {/* 颜色选择器 (色轮 + 亮度 + RGB) */}
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-stone-200/50 ring-1 ring-stone-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-stone-700">LED 调色</h3>
                <div 
                  className="w-10 h-10 rounded-full shadow-inner ring-2 ring-stone-100 transition-colors duration-200" 
                  style={{ backgroundColor: color }} 
                />
              </div>
              
              {/* 调整后的布局：色轮在左，滑块组在右 */}
              <div className="flex gap-8 justify-center items-start mb-8">
                {/* 左侧：色轮 */}
                <div className="relative flex-shrink-0">
                  <ColorWheel color={color} onChange={setColor} size={200} />
                </div>

                {/* 右侧：滑块组 (亮度, R, G, B) */}
                <div className="flex gap-3 h-[200px]">
                  {/* 亮度 */}
                  <BrightnessSlider color={color} onChange={setColor} />
                  
                  <div className="w-px bg-stone-100 h-full mx-1" />

                  {/* RGB */}
                  <RGBSlider channel="r" value={rgb.r} color={rgb} onChange={(v) => handleRgbChange('r', v)} />
                  <RGBSlider channel="g" value={rgb.g} color={rgb} onChange={(v) => handleRgbChange('g', v)} />
                  <RGBSlider channel="b" value={rgb.b} color={rgb} onChange={(v) => handleRgbChange('b', v)} />
                </div>
              </div>

              {/* RGB & Hex Inputs */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-xs font-bold text-stone-400 uppercase w-8 text-center">HEX</span>
                  <span className="text-stone-400 select-none">#</span>
                  <HexColorInput 
                    color={color} 
                    onChange={setColor} 
                    className="w-full bg-transparent outline-none text-stone-600 font-mono uppercase" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <RGBInput label="R" value={rgb.r} onChange={(v) => handleRgbChange('r', v)} />
                  <RGBInput label="G" value={rgb.g} onChange={(v) => handleRgbChange('g', v)} />
                  <RGBInput label="B" value={rgb.b} onChange={(v) => handleRgbChange('b', v)} />
                </div>
              </div>
            </div>

            {/* 历史颜色 */}
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-stone-200/50 ring-1 ring-stone-100">
              <h3 className="text-lg font-semibold text-stone-700 mb-4 flex items-center gap-2">
                <span>最近使用</span>
                <span className="text-xs font-normal text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                  {historyColors.length}
                </span>
              </h3>
              
              {historyColors.length === 0 ? (
                <div className="text-center py-8 text-stone-300 text-sm italic">
                  还没有使用过颜色...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {historyColors.map((c, i) => (
                    <button
                      key={c + i}
                      onClick={() => {
                        setColor(c);
                        setTool("brush");
                      }}
                      className="group relative w-10 h-10 rounded-full ring-1 ring-stone-100 shadow-sm hover:scale-110 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-300"
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      {c.toLowerCase() === color.toLowerCase() && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/80 drop-shadow-md">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 下部：Slot 栏 */}
        <div className="w-full max-w-5xl bg-white px-2 py-2 rounded-3xl shadow-xl shadow-stone-200/40 ring-1 ring-stone-100">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide p-4">
            {slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => handleSlotChange(slot.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-200 min-w-[80px] group",
                  currentSlotId === slot.id 
                    ? "bg-orange-50 ring-2 ring-orange-400 scale-105" 
                    : "hover:bg-stone-50 ring-1 ring-stone-100"
                )}
              >
                <div className="w-16 h-16 bg-stone-50 rounded-xl border border-stone-200 overflow-hidden grid grid-cols-8 gap-[1px] p-[1px] shadow-inner">
                  {slot.grid.flat().map((c, i) => (
                    <div key={i} className="w-full h-full rounded-[1px]" style={{ backgroundColor: c || 'transparent' }} />
                  ))}
                </div>
                <span className={cn(
                  "text-xs font-medium truncate max-w-[80px] transition-colors",
                  currentSlotId === slot.id ? "text-orange-600" : "text-stone-500 group-hover:text-stone-700"
                )}>
                  {slot.name}
                </span>
              </button>
            ))}
          </div>
        </div>

      </main>
      
      {/* 同步帮助弹窗 */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-stone-800 mb-4">同步模式指南</h3>
            <div className="bg-orange-50 p-4 rounded-xl text-orange-900 text-sm leading-relaxed mb-6 border border-orange-100">
              同步你的Matrix，请你将Matrix水平向上，尽量保证不进行任何横向移动，快速抬起然后落下。让Matrix的高度提升随后快速下降即可进入同步模式。
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="px-6 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- 组件部分 ---

// 色轮组件
interface ColorWheelProps {
  color: string;
  onChange: (color: string) => void;
  size: number;
}

function ColorWheel({ color, onChange, size }: ColorWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const hsl = colord(color).toHsl();
  
  const radius = size / 2;
  const pointerDist = (hsl.s / 100) * radius;
  const pointerAngle = (hsl.h - 90) * (Math.PI / 180);
  
  const x = radius + pointerDist * Math.cos(pointerAngle);
  const y = radius + pointerDist * Math.sin(pointerAngle);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    let hue = angle + 90;
    if (hue < 0) hue += 360;
    
    const dist = Math.sqrt(dx * dx + dy * dy);
    const saturation = Math.min(100, (dist / radius) * 100);
    
    const newColor = colord({ h: hue, s: saturation, l: hsl.l }).toHex();
    onChange(newColor);
  }, [radius, hsl.l, onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handleMove(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) handleMove(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      ref={containerRef}
      className="rounded-full cursor-crosshair shadow-inner ring-1 ring-stone-200 relative touch-none"
      style={{
        width: size,
        height: size,
        background: `
          radial-gradient(circle, white 0%, transparent 100%),
          conic-gradient(from 0deg, red, yellow, green, cyan, blue, magenta, red)
        `
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div 
        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
        style={{
          left: x - 8,
          top: y - 8,
          backgroundColor: color
        }}
      />
    </div>
  );
}

// 纵向亮度滑块组件
function BrightnessSlider({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  
  const hsl = colord(color).toHsl();
  
  const gradientStops = [
    colord({ ...hsl, l: 100 }).toHex(),
    colord({ ...hsl, l: 50 }).toHex(),
    colord({ ...hsl, l: 0 }).toHex(),
  ].join(', ');

  const topPercent = 100 - hsl.l; 

  const handleMove = useCallback((clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const height = rect.height;
    const relativeY = Math.min(height, Math.max(0, clientY - rect.top));
    const lightness = 100 - (relativeY / height) * 100;
    const newColor = colord({ ...hsl, l: lightness }).toHex();
    onChange(newColor);
  }, [hsl, onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handleMove(e.clientY);
  };
  
  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) handleMove(e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="h-full flex flex-col items-center gap-2">
      <Sun size={16} className="text-stone-400" />
      <div 
        ref={containerRef}
        className="relative w-8 flex-1 rounded-full shadow-inner ring-1 ring-stone-200 cursor-pointer overflow-hidden touch-none"
        style={{ background: `linear-gradient(to bottom, ${gradientStops})` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div 
          className="absolute left-0 right-0 h-1 bg-white/50 border-y border-black/10 pointer-events-none"
          style={{ top: `${topPercent}%` }}
        />
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md pointer-events-none bg-transparent"
          style={{ top: `calc(${topPercent}% - 12px)` }}
        />
      </div>
      <div className="text-xs font-mono text-stone-400">{Math.round(hsl.l)}%</div>
    </div>
  );
}

// 纵向 RGB 滑块组件
function RGBSlider({ 
  channel, 
  value, 
  color,
  onChange 
}: { 
  channel: 'r' | 'g' | 'b'; 
  value: number; 
  color: RgbColor;
  onChange: (val: number) => void 
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  
  // 生成渐变背景: channel 0 -> 255
  const startColor = { ...color, [channel]: 255 }; // Top
  const endColor = { ...color, [channel]: 0 }; // Bottom
  
  const gradient = `linear-gradient(to bottom, ${colord(startColor).toHex()}, ${colord(endColor).toHex()})`;
  
  // Value 0-255. 255 is top (0%), 0 is bottom (100%)
  const topPercent = 100 - (value / 255) * 100;

  const handleMove = useCallback((clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const height = rect.height;
    const relativeY = Math.min(height, Math.max(0, clientY - rect.top));
    
    // Map Y (0 -> height) to Value (255 -> 0)
    const val = 255 - (relativeY / height) * 255;
    onChange(Math.round(val));
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handleMove(e.clientY);
  };
  
  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) handleMove(e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const labels = { r: 'R', g: 'G', b: 'B' };

  return (
    <div className="h-full flex flex-col items-center gap-2">
      <span className="text-xs font-bold text-stone-400 uppercase">{labels[channel]}</span>
      <div 
        ref={containerRef}
        className="relative w-8 flex-1 rounded-full shadow-inner ring-1 ring-stone-200 cursor-pointer overflow-hidden touch-none"
        style={{ background: gradient }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div 
          className="absolute left-0 right-0 h-1 bg-white/50 border-y border-black/10 pointer-events-none"
          style={{ top: `${topPercent}%` }}
        />
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md pointer-events-none bg-transparent"
          style={{ top: `calc(${topPercent}% - 12px)` }}
        />
      </div>
      <div className="text-xs font-mono text-stone-400 w-6 text-center">{Math.round(value)}</div>
    </div>
  );
}

// 工具按钮
function ToolButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center p-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-stone-800 text-white shadow-md scale-105" 
          : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
      )}
    >
      {icon}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {label}
      </span>
    </button>
  );
}

// RGB 输入组件
function RGBInput({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-col items-center bg-stone-50 p-2 rounded-xl border border-stone-100 focus-within:ring-2 focus-within:ring-stone-200 transition-shadow">
      <span className="text-[10px] font-bold text-stone-400 mb-0.5">{label}</span>
      <input
        type="number"
        min={0}
        max={255}
        value={value}
        onChange={(e) => {
          const val = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
          onChange(val);
        }}
        className="w-full text-center bg-transparent outline-none font-mono text-sm text-stone-600 appearance-none"
      />
    </div>
  );
}
