
import React from 'react';
import { EntryType } from '../types';

interface Props {
  type: EntryType;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: (type: EntryType) => void;
  active?: boolean;
}

const QuickLogButton: React.FC<Props> = ({ type, label, icon, color, onClick, active }) => {
  return (
    <button
      onClick={() => onClick(type)}
      className={`
        flex flex-col items-center justify-center 
        w-full h-24 rounded-2xl transition-all duration-200 
        ${active ? 'ring-4 ring-offset-2 scale-95 shadow-inner' : 'shadow-md active:scale-95'}
        ${color}
      `}
    >
      <div className="text-white mb-1">
        {icon}
      </div>
      <span className="text-white text-xs font-semibold uppercase tracking-wider">
        {label}
      </span>
    </button>
  );
};

export default QuickLogButton;
