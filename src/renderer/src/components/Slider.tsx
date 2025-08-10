import React, { useState, useRef, useEffect } from "react";

const Slider = ({
  value,
  onChange,
  onChangeEnd,
  min = 1,
  max,
  label,
  unit = "",
}: {
  value: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  min?: number;
  max: number;
  label: string;
  unit?: string;
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;

  // Handle slider track click
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const trackWidth = rect.width;
    const clickPercentage = Math.min(Math.max(0, clickPosition / trackWidth), 1);
    const newValue = Math.round(min + clickPercentage * (max - min));
    onChange(newValue);
    onChangeEnd?.(newValue);
  };

  // Handle thumb drag
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const mousePosition = e.clientX - rect.left;
      const trackWidth = rect.width;
      const dragPercentage = Math.min(Math.max(0, mousePosition / trackWidth), 1);
      const newValue = Math.round(min + dragPercentage * (max - min));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onChangeEnd?.(value);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, min, max, onChange, onChangeEnd, value]);

  // Handle touch events for mobile
  const handleTouchStart = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const touchPosition = e.touches[0].clientX - rect.left;
      const trackWidth = rect.width;
      const dragPercentage = Math.min(Math.max(0, touchPosition / trackWidth), 1);
      const newValue = Math.round(min + dragPercentage * (max - min));
      onChange(newValue);
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onChangeEnd?.(value);
      }
    };

    if (isDragging) {
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, min, max, onChange, onChangeEnd, value]);

  return (
    <div className="w-full select-none">
      <div
        ref={sliderRef}
        className="relative flex items-center w-full h-10 bg-gray-200 dark:bg-[#1a1a1a] rounded-xl cursor-pointer overflow-hidden"
        onClick={handleTrackClick}
        role="slider"
        aria-label={`${label} slider`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            onChange(Math.min(value + 1, max));
            onChangeEnd?.(Math.min(value + 1, max));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            onChange(Math.max(value - 1, min));
            onChangeEnd?.(Math.max(value - 1, min));
          }
        }}
      >
        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 h-full rounded-xl bg-blue-500 dark:bg-[#2a2a2a] transition-all duration-150"
          style={{ width: `${Math.max(percentage - 1, 0)}%` }}
        ></div>

        {/* Label on the left */}
        <div className="flex-1 pl-4 relative z-10">
          <span className="text-gray-700 dark:text-gray-400 text-xs font-medium">{label}</span>
        </div>

        {/* Value on the right */}
        <div className="pr-4 relative z-10">
          <span className="text-gray-900 dark:text-white text-sm">
            {value}
            {unit}
          </span>
        </div>

        {/* Vertical line thumb that moves with the slider */}
        <div
          className="absolute h-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20 transition-all duration-150"
          style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="h-4/5 w-[3px] bg-gray-600 dark:bg-[#606060] rounded-full shadow-sm"></div>
        </div>

        {/* Draggable area */}
        <div
          className="absolute inset-0 z-10"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        ></div>
      </div>
    </div>
  );
};

export default Slider;