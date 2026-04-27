import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel"
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            onClick={onCancel}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto border border-slate-100"
            >
              <div className="p-6 pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <button 
                    onClick={onCancel}
                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm font-medium text-slate-500 mb-8">{message}</p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3 justify-end">
                <button
                  onClick={onCancel}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
