
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string; // e.g., 'max-w-2xl', 'max-w-4xl', 'max-w-5xl'
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-maroon-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={`bg-white w-full ${maxWidth} rounded-[2rem] shadow-2xl relative z-10 overflow-hidden animate-slide-up border border-gold-200 transition-all duration-300`}>
        <div className="bg-maroon px-8 py-6 flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold text-gold">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-gold-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
