import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'amber' | 'rose';
  subtext?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtext }) => {
  // Configuração de estilos baseados na cor escolhida
  const styles = {
    emerald: {
      container: 'bg-emerald-100/80 border-emerald-200',
      iconWrapper: 'bg-white text-emerald-600 shadow-sm shadow-emerald-100',
      title: 'text-emerald-800',
      value: 'text-emerald-900',
      subtext: 'text-emerald-700/80'
    },
    blue: {
      container: 'bg-blue-100/80 border-blue-200',
      iconWrapper: 'bg-white text-blue-600 shadow-sm shadow-blue-100',
      title: 'text-blue-800',
      value: 'text-blue-900',
      subtext: 'text-blue-700/80'
    },
    amber: {
      container: 'bg-amber-100/80 border-amber-200',
      iconWrapper: 'bg-white text-amber-600 shadow-sm shadow-amber-100',
      title: 'text-amber-800',
      value: 'text-amber-900',
      subtext: 'text-amber-800/80'
    },
    rose: {
      container: 'bg-rose-100/80 border-rose-200',
      iconWrapper: 'bg-white text-rose-600 shadow-sm shadow-rose-100',
      title: 'text-rose-800',
      value: 'text-rose-900',
      subtext: 'text-rose-800/80'
    },
  };

  const currentStyle = styles[color];

  return (
    <div className={`${currentStyle.container} rounded-2xl p-6 shadow-sm border flex items-start justify-between transition-transform hover:scale-[1.02] duration-200`}>
      <div>
        <p className={`text-sm font-bold uppercase tracking-wide ${currentStyle.title}`}>{title}</p>
        <h3 className={`text-2xl font-extrabold mt-1 ${currentStyle.value}`}>{value}</h3>
        {subtext && <p className={`text-xs font-medium mt-1 ${currentStyle.subtext}`}>{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${currentStyle.iconWrapper}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

export default StatCard;