"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AddBookmarkForm } from "./add-bookmark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddBookmarkModal({ isOpen, onClose }: AddBookmarkModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="p-8">
          <AddBookmarkForm onSuccess={onClose} />
        </div>
      </Card>
    </div>,
    document.body
  );
}
