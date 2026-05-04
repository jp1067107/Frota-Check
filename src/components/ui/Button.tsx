import React, { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'humongous';
  icon?: LucideIcon;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', icon: Icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          {
            'bg-[#FFB100] text-black hover:bg-[#ffc233] active:bg-[#CC8E00] font-bold shadow-[0_4px_0_#CC8E00] active:translate-y-1 active:shadow-none': variant === 'default',
            'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
            'border-2 border-[#FFB100] bg-transparent text-[#FFB100] hover:bg-[#FFB100]/10': variant === 'outline',
            'bg-white/5 border border-white/10 text-white hover:bg-white/10': variant === 'secondary',
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-[10px] uppercase font-bold tracking-widest': size === 'sm',
            'h-10 rounded-md px-8 text-base': size === 'lg',
            'h-9 w-9': size === 'icon',
            'w-full bg-[#FFB100] text-black font-black text-xl sm:text-2xl py-5 sm:py-6 rounded-xl sm:rounded-2xl shadow-[0_6px_0_#CC8E00] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider': size === 'humongous',
          },
          className
        )}
        {...props}
      >
        {Icon && <Icon className={cn("mr-2 h-5 w-5", size === 'humongous' && "mr-4 h-8 w-8")} />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
