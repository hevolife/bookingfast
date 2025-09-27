import React, { useState } from 'react';
import { Users, Minus, Plus } from 'lucide-react';

interface ParticipantSelectorProps {
  quantity: number;
  maxCapacity: number;
  onQuantityChange: (quantity: number) => void;
  disabled?: boolean;
  unitName?: string;
}

export function ParticipantSelector({ quantity, maxCapacity, onQuantityChange, disabled, unitName = 'participants' }: ParticipantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleQuantitySelect = (newQuantity: number) => {
    onQuantityChange(newQuantity);
    setIsOpen(false);
  };

  const incrementQuantity = () => {
    if (quantity < maxCapacity) {
      onQuantityChange(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Participants *
      </label>
      
      {/* Sélecteur principal */}
      <div className={`border rounded-2xl p-4 transition-all duration-300 ${
        disabled 
          ? 'bg-gray-100 border-gray-200' 
          : 'bg-white border-gray-300 hover:border-purple-400 hover:shadow-md'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {quantity} {unitName}{quantity > 1 && unitName === 'participants' ? 's' : ''}
              </div>
              <div className="text-xs text-gray-500">
                Maximum {maxCapacity} {unitName}{maxCapacity > 1 && unitName === 'participants' ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Contrôles rapides */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={decrementQuantity}
              disabled={disabled || quantity <= 1}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95"
            >
              <Minus className="w-4 h-4 text-gray-600 hover:text-red-600" />
            </button>
            
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              disabled={disabled}
              className="min-w-[50px] h-10 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {quantity}
            </button>
            
            <button
              type="button"
              onClick={incrementQuantity}
              disabled={disabled || quantity >= maxCapacity}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95"
            >
              <Plus className="w-4 h-4 text-gray-600 hover:text-green-600" />
            </button>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(quantity / maxCapacity) * 100}%` }}
          />
        </div>
      </div>

      {/* Sélecteur détaillé */}
      {isOpen && (
        <>
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100000] p-4">
            <div className="text-sm font-medium text-gray-700 mb-4 text-center">
              Choisir le nombre de participants
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleQuantitySelect(num)}
                  className={`aspect-square rounded-xl text-lg font-bold transition-all duration-300 transform hover:scale-110 active:scale-95 animate-fadeIn ${
                    quantity === num
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-600 border border-gray-200'
                  }`}
                  style={{ animationDelay: `${num * 50}ms` }}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              Capacité maximum : {maxCapacity} {unitName}{maxCapacity > 1 && unitName === 'participants' ? 's' : ''}
            </div>
          </div>

          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-[99999]" 
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}