"use client";

import type { ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

export function AppDialog({ isOpen, onOpenChange, label, className = "max-w-md", children }: { isOpen: boolean; onOpenChange: (open: boolean) => void; label: string; className?: string; children: ReactNode }) {
  return <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable className="fixed inset-0 z-100 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"><Modal className={`w-full ${className} overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl outline-none`}><Dialog aria-label={label} className="outline-none">{children}</Dialog></Modal></ModalOverlay>;
}
