import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Edit2, Trash2, Search, X, Upload, Image as ImageIcon } from 'lucide-react';

export default function Inventory() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [selectedProductForQr, setSelectedProductForQr] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    lowStockThreshold: '',
    imageUrl: ''
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const prods: Product[] = [];
    querySnapshot.forEach((doc) => {
      prods.push({ id: doc.id, ...doc.data() } as Product);
    });
    setProducts(prods);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price.toString(),
        stock: product.stock.toString(),
        lowStockThreshold: product.lowStockThreshold.toString(),
        imageUrl: product.imageUrl || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', category: '', price: '', stock: '', lowStockThreshold: '', imageUrl: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleOpenQrModal = (product: Product) => {
    setSelectedProductForQr(product);
    setShowQrModal(true);
  };

  const handleCloseQrModal = () => {
    setShowQrModal(false);
    setSelectedProductForQr(null);
  };

  const handleDownloadQr = () => {
    if (!selectedProductForQr) return;
    const svg = document.getElementById(`qr-svg-${selectedProductForQr.id}`);
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size with padding
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      
      // Draw white background
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw image in center
        ctx.drawImage(img, 20, 20);
        
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${selectedProductForQr.name.replace(/\\s+/g, '-')}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert('La imagen es demasiado grande. El tamaño máximo es 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, imageUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prodData = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      lowStockThreshold: parseInt(formData.lowStockThreshold),
      imageUrl: formData.imageUrl,
      updatedAt: Date.now()
    };

    if (editingProduct) {
      await updateDoc(doc(db, 'products', editingProduct.id), prodData);
      await addDoc(collection(db, 'audit_logs'), {
        action: 'UPDATE_PRODUCT',
        entityId: editingProduct.id,
        details: `Updated product ${prodData.name}`,
        userId: profile?.id,
        userEmail: profile?.email,
        timestamp: Date.now()
      });
    } else {
      const qrCodeData = `PROD-${Date.now()}`;
      const newDoc = await addDoc(collection(db, 'products'), {
        ...prodData,
        qrCodeData,
        createdAt: Date.now()
      });
      await addDoc(collection(db, 'audit_logs'), {
        action: 'CREATE_PRODUCT',
        entityId: newDoc.id,
        details: `Created product ${prodData.name}`,
        userId: profile?.id,
        userEmail: profile?.email,
        timestamp: Date.now()
      });
    }
    setShowModal(false);
    fetchProducts();
  };

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      await deleteDoc(doc(db, 'products', productToDelete));
      await addDoc(collection(db, 'audit_logs'), {
        action: 'DELETE_PRODUCT',
        entityId: productToDelete,
        details: `Deleted product ${productToDelete}`,
        userId: profile?.id,
        userEmail: profile?.email,
        timestamp: Date.now()
      });
      fetchProducts();
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-6 h-full min-h-0">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-[400px]">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800">Inventario en Tiempo Real</h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex gap-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar artículo..." 
                className="text-xs bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-lg w-full sm:w-48 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 whitespace-nowrap"
            >
              + Nuevo Artículo
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 w-16">Img</th>
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3">Precio</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">QR</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.map(product => {
                const isLowStock = product.stock <= product.lowStockThreshold;
                const isCritical = product.stock === 0;
                return (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{product.name}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{product.description}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{product.category}</td>
                  <td className="px-6 py-4 font-mono font-medium text-slate-800">${product.price.toFixed(2)}</td>
                  <td className={`px-6 py-4 font-bold ${isCritical ? 'text-rose-600' : isLowStock ? 'text-amber-500' : 'text-slate-700'}`}>
                    {product.stock}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      isCritical ? 'bg-rose-100 text-rose-700' : 
                      isLowStock ? 'bg-amber-100 text-amber-700' : 
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isCritical ? 'Agotado' : isLowStock ? 'Stock Bajo' : 'Disponible'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button 
                      onClick={() => handleOpenQrModal(product)}
                      className="w-8 h-8 bg-white p-0.5 border border-slate-200 rounded hover:border-indigo-500 hover:shadow-md transition-all block cursor-pointer"
                    >
                      <QRCodeSVG value={product.qrCodeData} size={100} style={{ width: '100%', height: '100%' }} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenModal(product)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteClick(product.id)} className="text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No se encontraron artículos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {editingProduct ? 'Editar Artículo' : 'Nuevo Artículo'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Imagen del Artículo (Opcional)</label>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors w-full justify-center"
                        >
                          <Upload size={16} />
                          Subir o Tomar Foto
                        </button>
                        {formData.imageUrl && (
                          <button
                            type="button"
                            onClick={removeImage}
                            className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Máximo 500KB.</p>
                    </div>
                    {formData.imageUrl && (
                      <img src={formData.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Descripción</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Precio ($)</label>
                    <input required type="number" step="0.01" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Stock</label>
                    <input required type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Alerta Stock Bajo</label>
                  <input required type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: e.target.value})} />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 rounded-b-2xl">
              <button onClick={handleCloseModal} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" form="productForm" className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && selectedProductForQr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                Código QR
              </h3>
              <button onClick={handleCloseQrModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center bg-slate-50">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                <QRCodeSVG 
                  id={`qr-svg-${selectedProductForQr.id}`}
                  value={selectedProductForQr.qrCodeData} 
                  size={200} 
                  level="H"
                  includeMargin={true}
                />
              </div>
              <h4 className="font-bold text-slate-800 text-center text-lg">{selectedProductForQr.name}</h4>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{selectedProductForQr.qrCodeData}</p>
            </div>
            <div className="p-5 border-t border-slate-100 flex flex-col gap-3 rounded-b-2xl">
              <button 
                onClick={handleDownloadQr} 
                className="w-full py-3 bg-indigo-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                Descargar QR para Imprimir
              </button>
              <button 
                onClick={handleCloseQrModal} 
                className="w-full py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col border border-slate-200 p-6 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-rose-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Eliminar Artículo</h3>
            <p className="text-slate-500 text-sm mb-6">¿Estás seguro de que deseas eliminar este artículo? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 bg-rose-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
