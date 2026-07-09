import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, SaleItem, Customer } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ShoppingCart, Camera, Trash2, CheckCircle, X, Search, User, AlertCircle, Package } from 'lucide-react';

export default function POS() {
  const { profile } = useAuth();
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Mercado Pago' | 'Transferencia Bancaria'>('Mercado Pago');
  const [changeAmount, setChangeAmount] = useState<string>('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    const fetchCustomersAndProducts = async () => {
      try {
        const [customersSnap, productsSnap] = await Promise.all([
          getDocs(query(collection(db, 'customers'), orderBy('firstName', 'asc'))),
          getDocs(query(collection(db, 'products'), orderBy('name', 'asc')))
        ]);

        const customersList: Customer[] = [];
        customersSnap.forEach(d => customersList.push({ id: d.id, ...d.data() } as Customer));
        setCustomers(customersList);

        const productsList: Product[] = [];
        productsSnap.forEach(d => productsList.push({ id: d.id, ...d.data() } as Product));
        setProducts(productsList);

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchCustomersAndProducts();
  }, []);

  const filteredCustomers = customers.filter(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.phone.includes(customerSearchQuery)
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const handleScan = async (result: string) => {
    // Expected result format: the qrCodeData of a product
    try {
      const q = query(collection(db, 'products'), where('qrCodeData', '==', result));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const productDoc = querySnapshot.docs[0];
        const product = { id: productDoc.id, ...productDoc.data() } as Product;
        
        if (product.stock > 0) {
          addToCart(product);
        } else {
          showError('Este producto no tiene stock disponible.');
        }
      } else {
        showError('Producto no encontrado en el inventario.');
      }
    } catch (error) {
      console.error('Error scanning code', error);
      showError('Error al escanear el código.');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        // check stock limit
        if (existing.quantity >= product.stock) {
          showError(`No puedes agregar más. Stock máximo: ${product.stock}`);
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
        sellerEmail: profile.email,
        paymentMethod,
        ...(paymentMethod === 'Efectivo' && changeAmount ? { change: parseFloat(changeAmount) } : {}),
        ...(selectedCustomer ? { customerId: selectedCustomer.id, customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}` } : {})
      });

      // Show success
      setCart([]);
      setChangeAmount('');
      setPaymentMethod('Mercado Pago');
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (error: any) {
      console.error(error);
      showError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 flex-1 relative">
      {/* Toast Notification */}
      {errorMsg && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 shadow-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="font-semibold text-sm">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-red-100 rounded-lg ml-2">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {showScanner ? (
        <div className="absolute inset-0 z-40 bg-slate-900 rounded-2xl overflow-hidden flex flex-col border-4 border-slate-800">
          <div className="absolute inset-0 z-0 bg-black">
            <Scanner 
              onScan={(result) => handleScan(result[0].rawValue)}
              onError={(error) => console.error(error)}
            />
          </div>
          
          {/* Overlay elements */}
          <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
             <div className="bg-white text-slate-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                <ShoppingCart size={18} />
                <span className="text-lg">x{cart.reduce((acc, i) => acc + i.quantity, 0)}</span>
             </div>
          </div>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
             <button onClick={() => setShowScanner(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 text-lg">
                <CheckCircle size={20} />
                Listo
             </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl mx-auto flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
            <h2 className="font-bold text-slate-800">Caja Actual</h2>
            
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar artículos por nombre..." 
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors text-sm"
                />
                
                {/* Search Results Dropdown */}
                {productSearchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500 text-center">No se encontraron productos</div>
                    ) : (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => {
                            if (product.stock > 0) {
                              addToCart(product);
                              setProductSearchQuery(''); // clear search after adding
                            } else {
                              showError('Sin stock');
                            }
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors"
                        >
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{product.name}</p>
                            <p className="text-xs text-slate-500">Stock: {product.stock}</p>
                          </div>
                          <span className="font-bold text-indigo-600">${product.price.toFixed(2)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowScanner(true)}
                className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm flex-shrink-0"
                title="Escanear QR"
              >
                <Camera size={20} />
              </button>
            </div>
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

          <div className="mb-4 space-y-3">
            <div className="relative">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Cliente (Opcional)</label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <User size={16} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-indigo-900 truncate">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-indigo-400 hover:text-indigo-600 p-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar cliente..." 
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white placeholder-slate-400"
                    />
                  </div>
                  {showCustomerDropdown && customerSearchQuery.trim() !== '' && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerSearchQuery('');
                              setShowCustomerDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                          >
                            <p className="text-sm font-semibold text-slate-800">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-slate-500">{c.phone}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-slate-500 text-center">No se encontraron clientes</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Método de Pago</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="Mercado Pago">Mercado Pago</option>
                <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                <option value="Efectivo">Efectivo</option>
              </select>
            </div>
            
            {paymentMethod === 'Efectivo' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Vuelto ($)</label>
                <input 
                  type="number"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  placeholder="Ej: 500"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                />
              </div>
            )}
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
      )}
    </div>
  );
}
