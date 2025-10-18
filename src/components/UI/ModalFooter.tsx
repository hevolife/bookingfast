import React from 'react';

interface ModalFooterButton {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
}

interface ModalFooterProps {
  buttons: ModalFooterButton[];
}

const BUTTON_STYLES = {
  primary: {
    base: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
    hover: 'hover:from-green-600 hover:to-emerald-600',
    shadow: 'shadow-xl'
  },
  secondary: {
    base: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
    hover: 'hover:from-gray-600 hover:to-gray-700',
    shadow: 'shadow-lg'
  },
  danger: {
    base: 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
    hover: 'hover:from-red-600 hover:to-pink-600',
    shadow: 'shadow-lg'
  }
};

export function ModalFooter({ buttons }: ModalFooterProps) {
  const renderButton = (button: ModalFooterButton, index: number) => {
    const styles = BUTTON_STYLES[button.variant];
    const isPrimary = button.variant === 'primary';
    const isDisabled = button.disabled || button.loading;

    return (
      <button
        key={index}
        type={isPrimary ? 'submit' : 'button'}
        onClick={button.onClick}
        disabled={isDisabled}
        className={`
          ${isPrimary ? 'flex-1' : 'min-w-[120px]'}
          h-[52px]
          px-6 rounded-xl font-bold text-sm sm:text-base
          ${styles.base} ${styles.hover} ${styles.shadow}
          transition-all duration-300 transform hover:scale-105
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          flex items-center justify-center gap-2
        `}
      >
        {button.loading ? (
          <span>Chargement...</span>
        ) : (
          <>
            {button.icon && <span>{button.icon}</span>}
            <span>{button.label}</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-white border-t border-gray-200 mt-6">
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        {buttons.map((button, index) => renderButton(button, index))}
      </div>
    </div>
  );
}
