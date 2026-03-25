"use client";

import { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  type: "error" | "success" | "info";
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-[100px] left-4 right-4 md:left-auto md:right-[20px] z-[100] flex flex-col gap-[10px] max-w-[400px]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor = toast.type === "error" ? "#f85858" : toast.type === "success" ? "#22c55e" : "#3b82f6";
  const icon = toast.type === "error" ? "\u2716" : toast.type === "success" ? "\u2714" : "\u24d8";

  return (
    <div
      className="flex items-start gap-[10px] px-[16px] py-[12px] rounded-[10px] text-white text-[13px] shadow-lg transition-all duration-300"
      style={{
        backgroundColor: "#1c1c1c",
        borderLeft: `4px solid ${bgColor}`,
        fontFamily: "'Inter', sans-serif",
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? "translateX(100%)" : "translateX(0)",
      }}
    >
      <span style={{ color: bgColor, fontSize: "16px", lineHeight: "1" }}>{icon}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => { setIsExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
        className="text-[#a1a1a1] hover:text-white transition-colors text-[14px] leading-none"
      >
        &times;
      </button>
    </div>
  );
}

// Helper hook
let toastCounter = 0;
export function createToast(type: ToastMessage["type"], message: string): ToastMessage {
  return { id: `toast-${++toastCounter}-${Date.now()}`, type, message };
}
