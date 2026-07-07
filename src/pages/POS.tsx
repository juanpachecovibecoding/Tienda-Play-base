import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, SaleItem } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ShoppingCart, Camera, Trash2, CheckCircle, X } from 'lucide-react';

export default function POS() {
  const { profile } = useAuth();
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleScan = async (result: string) => {
    // Expected result format: the qrCodeData of a product
    setShowScanner(false);
    try {
      const q = query(collection(db, 'products'), where('qrCodeData', '==', result));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const productDoc = querySnapshot.docs[0];
        const product = { id: productDoc.id, ...productDoc.data() } as Product;
        
        if (product.stock > 0) {
          addToCart(product);
        } else {
          alert('Este producto no tiene stock disponible.');
        }
      } else {
        alert('Producto no encontrado en el inventario.');
      }
    } catch (error) {
      console.error('Error scanning code', error);
      alert('Error al escanear el cÃ³digo.');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        // check stock limit
        if (existing.quantity >= product.stock) {
          alert(`No puedes agregar mÃ¡s. Stock mÃ¡ximo: ${product.stock}`);
          return prev;
        }
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, priceAtSale: product.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQ = item.quantity + delta;
        if (newQ < 1) return item;
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !profile) return;
    setProcessing(true);
    
    try {
      // 1. Double check stock before finalizing
      for (const item of cart) {
        const pDoc = await getDoc(doc(db, 'products', item.productId));
        const pData = pDoc.data() as Product;
        if (pData.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.name}. Disponible: ${pData.stock}`);
        }
      }

      // 2. Reduce stock
      for (const item of cart) {
        const pRef = doc(db, 'products', item.productId);
        const pDoc = await getDoc(pRef);
        const pData = pDoc.data() as Product;
        await updateDoc(pRef, {
          stock: pData.stock - item.quantity,
          updatedAt: Date.now()
        });
      }

      // 3. Register Sale
      await addDoc(collection(db, 'sales'), {
        date: Date.now(),
        items: cart,
        total,
        sellerUid: profile.id,
        sellerEmail: profile.email
      });

      // Show success
      setCart([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 flex-1">
      {/* Scanner Section */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-slate-900 rounded-2xl flex-1 relative overflow-hidden flex flex-col items-center justify-center text-white border-4 border-slate-800">
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => setShowScanner(!showScanner)}
              className="px-4 py-2 bg-slate-800/80 text-white rounded-lg text-sm font-medium border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Camera size={16} />
              {showScanner ? 'Apagar' : 'Encender'}
            </button>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none z-0"></div>
          
          {showScanner ? (
            <div className="w-full h-full absolute inset-0 z-0 bg-black">
              <Scanner 
                onScan={(result) => handleScan(result[0].rawValue)}
                onError={(error) => console.error(error)}
              />
            </div>
          ) : (
            <div className="z-10 flex flex-col items-center">
              <div className="w-48 h-48 border-2 border-indigo-400 border-dashed rounded-xl flex flex-col items-center justify-center bg-slate-800/50 relative">
                <div className="w-32 h-32 opacity-20 bg-white rounded-lg"></div>
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-indigo-400"></div>
                <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-indigo-400"></div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-indigo-400"></div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-indigo-400"></div>
                <span className="mt-4 text-[10px] uppercase tracking-widest font-bold text-indigo-300">Cámara Apagada</span>
              </div>
              <div className="mt-8 text-center px-6">
                <h3 className="font-bold text-lg">Terminal de Cobro</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Apunte la cámara al código QR del producto para agregarlo a la venta.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-[400px] flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Caja Actual</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              La caja está vacía
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                <div className="flex-1 overflow-hidden pr-2">
                  <p className="font-semibold text-slate-800 text-sm truncate">{item.name}</p>
                  <p className="text-xs font-mono text-slate-500">${item.priceAtSale.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 bg-white rounded-lg border border-slate-200 shadow-sm p-0.5">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">-</button>
                    <span className="font-bold text-xs w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="text-rose-400 hover:text-rose-600 p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total a Pagar</span>
            <span className="text-2xl font-bold text-slate-800">${total.toFixed(2)}</span>
          </div>
          
          <button 
            disabled={cart.length === 0 || processing}
            onClick={handleCheckout}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all ${
              cart.length === 0 || processing 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
            }`}
          >
            {processing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : success ? (
              <CheckCircle className="mr-2" size={20} />
            ) : null}
            {success ? 'Venta Completada' : processing ? 'Procesando...' : 'Cerrar Venta'}
          </button>
        </div>
      </div>
    </div>
  );
}
