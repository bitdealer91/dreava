import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const CancelWarningModal = ({ isVisible, onConfirm, onCancel, title = "Cancel Upload", message = "Are you sure you want to cancel this upload? All progress will be lost and you'll need to start over." }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[11000] flex items-center justify-center p-4">
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full animate-fadeIn" tabIndex={-1} autoFocus>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-zinc-400 text-sm">This action cannot be undone</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-zinc-300 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-700/50 hover:bg-zinc-600/50 text-white font-semibold transition-all duration-200 hover:scale-105"
          >
            Continue
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-red-500/25"
          >
            Cancel Process
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default CancelWarningModal; 