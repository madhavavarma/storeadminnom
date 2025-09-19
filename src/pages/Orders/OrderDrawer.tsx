import { getProducts } from "../api";
import type { IProduct, IOption } from "@/interfaces/IProduct";
// ...existing code...
// StatusBadge copied from Orders.tsx for direct use
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Paid: "bg-green-600 text-white border border-green-600",
    Unpaid: "bg-amber-500 text-white border border-amber-500",
    Refund: "bg-rose-500 text-white border border-rose-500",
    Draft: "bg-gray-400 text-white border border-gray-400",
    Packaging: "bg-lime-500 text-white border border-lime-500",
    Completed: "bg-emerald-600 text-white border border-emerald-600",
    Cancelled: "bg-rose-700 text-white border border-rose-700",
    Processing: "bg-cyan-600 text-white border border-cyan-600",
    Shipped: "bg-sky-600 text-white border border-sky-600",
    Delivered: "bg-green-700 text-white border border-green-700",
    Returned: "bg-orange-500 text-white border border-orange-500",
    Pending: "bg-yellow-500 text-white border border-yellow-500",
    Confirmed: "bg-gray-500 text-white border border-gray-500",
  };
  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all ${
        styles[status] || "bg-gray-300 text-white border border-gray-400"
      }`}
      style={{ minWidth: 80, textAlign: 'center', letterSpacing: 0.5 }}
    >
      {status}
    </span>
  );
}
// Minor padding added to details section
import { useSelector, useDispatch } from "react-redux";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Trash2,
  ShoppingBag,
  PackageCheck,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAppSettings } from "../api";
import { toast } from "sonner";
import type { ICheckout } from "@/interfaces/ICheckout";
import { ProductActions } from "@/store/ProductSlice";
import type { IState } from "@/store/interfaces/IState";
import { updateOrder } from "../api";
import { supabase } from "@/supabaseClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OrdersActions, type IOrder, OrderStatus } from "@/store/OrdersSlice";
// import type { IOption } from "@/interfaces/IProduct";



interface OrderSummaryProps {
  onClose?: () => void;
}

export default function OrderSummary({ onClose }: OrderSummaryProps) {
  // Product modification state
  const [allProducts, setAllProducts] = useState<IProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<{ [variantName: string]: IOption }>({});
  const [addQuantity, setAddQuantity] = useState(1);

  useEffect(() => {
    getProducts().then(setAllProducts);
  }, []);

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const newItem = {
      product: selectedProduct,
      selectedOptions: { ...selectedVariants },
      quantity: addQuantity,
      totalPrice: (selectedProduct.price + Object.values(selectedVariants).reduce((sum, o) => sum + (o?.price || 0), 0)) * addQuantity,
    };
    dispatch(OrdersActions.showOrderDetail({
      ...cart,
      id: cart?.id ? String(cart.id) : '',
      created_at: cart?.created_at ? String(cart.created_at) : '',
      cartitems: [...cartitems, newItem],
      totalquantity: (cart?.totalquantity || 0) + addQuantity,
      totalprice: (cart?.totalprice || 0) + newItem.totalPrice,
    }));
    setSelectedProduct(null);
    setSelectedVariants({});
    setAddQuantity(1);
    setProductSearch("");
  };

  // Removed unused handleRemoveProduct

  // Removed unused handleEditQuantity
  const cart = useSelector((state: IState) => state.Orders.showOrder);
  const cartitems = useSelector((state: IState) => state.Orders.showOrder?.cartitems || []);
  const totalAmount = cartitems?.reduce((acc, item) => acc + item.totalPrice, 0);
  const dispatch = useDispatch();
  const checkoutData = useSelector((state: IState) => state.Orders.showOrder?.checkoutdata);
  const [status, setStatus] = useState(cart?.status || 'Pending');
  // Allow dynamic fields in formData, but always include ICheckout fields
  function ensureCheckoutFields(data: any): ICheckout & Record<string, any> {
    return {
      phone: data?.phone ?? '',
      email: data?.email ?? '',
      whatsapp: data?.whatsapp ?? '',
      address: data?.address ?? '',
      city: data?.city ?? '',
      pincode: data?.pincode ?? '',
      paymentMethod: data?.paymentMethod ?? 'cod',
      ...data
    };
  }

  const [formData, setFormData] = useState<ICheckout & Record<string, any>>(ensureCheckoutFields(checkoutData));

  // Sync formData with checkoutData when order changes
  useEffect(() => {
    setFormData(ensureCheckoutFields(checkoutData));
  }, [checkoutData]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Status change handler
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
  };
  

  useEffect(() => {    
    dispatch(ProductActions.setProductDetail(null));
  }, []);




  // Dynamic checkout sections from app settings
  const [checkoutSections, setCheckoutSections] = useState<any[]>([]);
  useEffect(() => {
    getAppSettings().then((settings) => {
      setCheckoutSections(settings?.branding?.checkoutSections || []);
    });
  }, []);

  // Add missing state for sameAsPhone
  const [sameAsPhone, setSameAsPhone] = useState(false);

  // Allow any field name/type
  const handleChange = (field: string, value: any) => {
  setFormData((prev: ICheckout & Record<string, any>) => ({ ...prev, [field]: value }));

    // Special logic for whatsapp same as phone
    if (field === 'phone' && sameAsPhone) {
  setFormData((prev: ICheckout & Record<string, any>) => ({ ...prev, whatsapp: value }));
    }
    if (field === 'whatsapp') {
      setSameAsPhone(value === formData.phone && value !== '');
    }
  };



  // Manual update handler for Update Order button
  const handleUpdateOrder = async () => {
    if (!cart?.id) return;
    const updatedOrder: Partial<IOrder> = {
      ...cart,
      status: status as OrderStatus,
      checkoutdata: formData,
      cartitems: cartitems,
      totalquantity: cartitems.reduce((sum, item) => sum + (item.quantity || 0), 0),
      totalprice: cartitems.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    };
    await updateOrder(String(cart.id), updatedOrder);
    toast.success("Order updated successfully!");
    if (onClose) onClose();
  };

  // Delete order and its child order_items
  const handleDeleteOrder = async () => {
    if (!cart?.id) return;
    setDeleting(true);
    // Remove child order_items first
    await supabase.from('order_items').delete().eq('order_id', cart.id);
    // Remove the order itself
    await supabase.from('orders').delete().eq('id', cart.id);
    setDeleting(false);
    toast.success('Order deleted successfully!');
    setDeleteDialogOpen(false);
    if (onClose) onClose();
    // Optionally, dispatch(OrdersActions.removeOrder(cart.id));
  };

  const handleRemoveItem = (item: any) => {
    dispatch(
      OrdersActions.removeItem({
        productId: item.product.id,
        selectedOptions: item.selectedOptions,
      })
    );
  };

  // Status subtext mapping
  const statusSubtext: Record<string, string> = {
    Pending: 'We are preparing your order',
    Confirmed: 'Order confirmed',
    Processing: 'Order is being processed',
    Shipped: 'Your order is on the way',
    Delivered: 'Your order has been delivered',
    Cancelled: 'Your order was cancelled',
    Returned: 'Order returned',
  };

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-green-700 dark:text-green-200">Order Details</h1>
        <div className="flex gap-2 items-center">
          <Button
            variant="destructive"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-zinc-700"
            onClick={onClose}
            disabled={deleting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Order?"
        description="Are you sure you want to delete this order? This will remove the order and all its items. This action cannot be undone."
        confirmText={deleting ? "Deleting..." : "Yes, Delete"}
        cancelText="Cancel"
        onConfirm={handleDeleteOrder}
        onCancel={() => setDeleteDialogOpen(false)}
      />
      {/* Scrollable Content */}
  <div className="flex-1 overflow-y-auto px-2 pb-28">{/* Add bottom padding for button and minor side padding */}
        {/* Order Details Card */}
  {/* All product editing will be done in the main order items card below. */}
        <Card className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 shadow-sm mb-2">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-500">Order Number</span>
              <span className="text-xl font-bold text-green-700">#{cart?.id ?? '--'}</span>
            </div>
            <div className="flex flex-row flex-wrap gap-4 mt-2">
              <div className="flex flex-col min-w-[120px]">
                <span className="text-xs text-gray-500">Date</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cart?.created_at ? new Date(cart.created_at).toLocaleString() : '--'}</span>
              </div>
              <div className="flex flex-col min-w-[120px]">
                <span className="text-xs text-gray-500">Status</span>
                <span className="text-sm font-medium"><span className="inline-block"><StatusBadge status={cart?.status || 'Pending'} /></span></span>
              </div>
              <div className="flex flex-col min-w-[120px]">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-sm font-bold text-emerald-600">₹{cart?.totalprice ?? '--'}</span>
              </div>
              <div className="flex flex-col min-w-[120px]">
                <span className="text-xs text-gray-500">Customer</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {/* Customer display logic using showOnOrders fields from branding config */}
                  {(() => {
                    const [customerDisplay, setCustomerDisplay] = useState<string>("--");
                    const [branding, setBranding] = useState<any>(null);
                    useEffect(() => {
                      getAppSettings().then((settings) => {
                        setBranding(settings?.branding || null);
                      });
                    }, []);
                    useEffect(() => {
                      if (!branding) return;
                      const checkoutSections = branding.checkoutSections || [];
                      const showOnOrdersFields = checkoutSections.flatMap((section: any) =>
                        (section.fields || []).filter((f: any) => f.showOnOrders)
                      );
                      const values = showOnOrdersFields
                        .map((f: any) => cart?.checkoutdata?.[f.name])
                        .filter((v: any) => v && String(v).trim() !== "");
                      if (values.length > 0) {
                        setCustomerDisplay(values.join(" | "));
                        return;
                      }
                      if (cart?.checkoutdata?.phone) {
                        setCustomerDisplay(cart.checkoutdata.phone);
                        return;
                      }
                      if (cart?.checkoutdata?.email) {
                        setCustomerDisplay(cart.checkoutdata.email);
                        return;
                      }
                      setCustomerDisplay("Unknown");
                    }, [branding, cart]);
                    return customerDisplay;
                  })()}
                </span>
              </div>
              <div className="flex flex-col min-w-[120px]">
                <span className="text-xs text-gray-500">Payment</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cart?.checkoutdata?.paymentMethod ? cart?.checkoutdata?.paymentMethod.toUpperCase() : '--'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Status Update Card */}
        <Card className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 shadow-sm mb-2">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-700 font-semibold">Order Status</span>
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm mt-2"
              value={status}
              onChange={handleStatusChange}
            >
              {Object.values(OrderStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400 mt-1">{statusSubtext[status] ?? ''}</span>
          </CardContent>
        </Card>
        {/* ...rest of the content... */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Left: Cart Summary */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-green-50 dark:bg-zinc-900 border-green-200 dark:border-zinc-800">
                <CardContent className="p-4 space-y-4">
                  <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 flex-row  pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    🛒 Order Items     
                    {/* Product & Item Count */}
                    <div className="pl-1 flex items-center gap-2 bg-green-50 dark:bg-zinc-800 rounded-full text-sm font-medium flex-shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                      {cartitems.length} Product{cartitems.length > 1 && "s"}
                      <span className="mx-1">•</span>
                      <PackageCheck className="w-4 h-4" />
                      {cartitems?.reduce((total, item) => total + item.quantity, 0)} Item
                      {cartitems?.reduce((total, item) => total + item.quantity, 0) > 1 && "s"}
                    </div>                         
                  </h2>
                  {cartitems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 py-4 text-sm relative bg-transparent"
                    >
                      {/* Product Image */}
                      <img
                        src={item.product.imageUrls?.[0]}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                          {item.product.name}
                        </p>
                        {/* Inline variant/option editing */}
                        {item.product.productvariants && item.product.productvariants.length > 0 && (
                          <div className="flex flex-col gap-1 mt-1">
                            {item.product.productvariants.map(variant => (
                              <div key={variant.id} className="flex items-center gap-2">
                                <span className="text-xs w-24">{variant.name}:</span>
                                <select
                                  className="border rounded px-1 py-0.5 text-xs"
                                  value={item.selectedOptions[variant.name]?.id || ''}
                                  onChange={e => {
                                    const opt = variant.productvariantoptions.find(o => o.id === Number(e.target.value));
                                    if (!opt) return;
                                    // Update selectedOptions for this item
                                    const newSelectedOptions = { ...item.selectedOptions, [variant.name]: opt };
                                    // Recalculate totalPrice
                                    const basePrice = item.product.price;
                                    const optionsPrice = Object.values(newSelectedOptions).reduce((sum, o) => sum + (o?.price || 0), 0);
                                    const newTotalPrice = (basePrice + optionsPrice) * item.quantity;
                                    // Update cart item in Redux
                                    const newItems = [...cartitems];
                                    newItems[idx] = { ...item, selectedOptions: newSelectedOptions, totalPrice: newTotalPrice };
                                    dispatch(OrdersActions.showOrderDetail({
                                      ...cart,
                                      id: cart?.id ? String(cart.id) : '',
                                      created_at: cart?.created_at ? String(cart.created_at) : '',
                                      cartitems: newItems,
                                      totalquantity: newItems.reduce((sum, it) => sum + (it.quantity || 0), 0),
                                      totalprice: newItems.reduce((sum, it) => sum + (it.totalPrice || 0), 0),
                                    }));
                                  }}
                                >
                                  <option value="">Select</option>
                                  {variant.productvariantoptions.map(opt => (
                                    <option key={opt.id} value={opt.id} disabled={!opt.ispublished || opt.isoutofstock}>
                                      {opt.name} {opt.price ? `(+₹${opt.price})` : ''} {opt.isoutofstock ? '(Out of stock)' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Quantity & Price Section */}
                        <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-full px-2 py-1 gap-2 border border-gray-200 dark:border-zinc-700">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-lg text-gray-700 dark:text-gray-100 bg-white dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 focus:bg-gray-200 dark:focus:bg-zinc-600 border border-gray-200 dark:border-zinc-700"
                              style={{ color: 'inherit', backgroundColor: 'inherit' }}
                              onClick={() => dispatch(OrdersActions.decreaseQuantity({ productId: item.product.id ?? 0, selectedOptions: item.selectedOptions }))}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="px-2 min-w-[24px] text-center font-semibold text-gray-800 dark:text-gray-100">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-lg text-gray-700 dark:text-gray-100 bg-white dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 focus:bg-gray-200 dark:focus:bg-zinc-600 border border-gray-200 dark:border-zinc-700"
                              style={{ color: 'inherit', backgroundColor: 'inherit' }}
                              onClick={() => dispatch(OrdersActions.increaseQuantity({ productId: item.product.id ?? 0, selectedOptions: item.selectedOptions }))}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 absolute top-2 right-2 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-zinc-700 focus:bg-red-100 dark:focus:bg-zinc-700 border border-red-200 dark:border-zinc-700"
                        style={{ color: '#ef4444', backgroundColor: 'inherit' }}
                        onClick={() => handleRemoveItem(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                    {/* Inline Add Product Section */}
                    <div className="mt-4 border-t pt-4">
                      <details>
                        <summary className="cursor-pointer text-green-700 font-semibold mb-2">+ Add Product</summary>
                        <div className="flex flex-col gap-2 mt-2">
                          <input
                            className="border rounded px-2 py-1 text-sm"
                            placeholder="Search product..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                          />
                          <div className="max-h-32 overflow-y-auto border rounded bg-white dark:bg-zinc-900">
                            {allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8).map(p => (
                              <div key={p.id} className={`px-2 py-1 cursor-pointer hover:bg-green-50 dark:hover:bg-zinc-800 ${selectedProduct?.id === p.id ? 'bg-green-100 dark:bg-zinc-700' : ''}`} onClick={() => setSelectedProduct(p)}>
                                {p.name}
                              </div>
                            ))}
                          </div>
                          {selectedProduct && (
                            <div className="flex flex-col gap-2 mt-2 border-t pt-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{selectedProduct.name}</span>
                                <span className="text-xs text-emerald-600">₹{selectedProduct.price}</span>
                              </div>
                              {selectedProduct.productvariants && selectedProduct.productvariants.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  {selectedProduct.productvariants.map(variant => (
                                    <div key={variant.id} className="flex items-center gap-2">
                                      <span className="text-xs w-24">{variant.name}:</span>
                                      <select
                                        className="border rounded px-1 py-0.5 text-xs"
                                        value={selectedVariants[variant.name]?.id || ''}
                                        onChange={e => {
                                          const opt = variant.productvariantoptions.find(o => o.id === Number(e.target.value));
                                          setSelectedVariants(v => ({ ...v, [variant.name]: opt! }));
                                        }}
                                      >
                                        <option value="">Select</option>
                                        {variant.productvariantoptions.map(opt => (
                                          <option key={opt.id} value={opt.id} disabled={!opt.ispublished || opt.isoutofstock}>
                                            {opt.name} {opt.price ? `(+₹${opt.price})` : ''} {opt.isoutofstock ? '(Out of stock)' : ''}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs">Qty:</span>
                                <input type="number" min={1} value={addQuantity} onChange={e => setAddQuantity(Number(e.target.value))} className="border rounded px-1 py-0.5 text-xs w-16" />
                                <Button size="sm" className="ml-2 px-3 py-1 text-xs" onClick={handleAddProduct}>Add</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  <div className="pt-2 flex items-center justify-between text-green-800 dark:text-green-200 font-semibold gap-4 flex-wrap sm:flex-nowrap border-t border-zinc-200 dark:border-zinc-800 mt-2 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      {/* Label */}
                      <span className="text-base whitespace-nowrap">Total</span>
                    </div>
                    {/* Amount */}
                    <span className="text-sm font-extrabold text-white bg-green-500 dark:bg-green-700 px-3 py-1 rounded-md shadow-sm">
                      ₹{totalAmount}
                    </span>
                  </div>
                  {/* Pending Amount */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-base text-yellow-700 dark:text-yellow-300 font-semibold">Pending Amount</span>
                    <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900 px-3 py-1 rounded-md">
                      ₹{(totalAmount - ((cart?.checkoutdata as any)?.paid ?? 0)).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right: Dynamic Checkout Sections (Editable) */}
          <div className="space-y-6">
            {checkoutSections.length > 0 ? (
              checkoutSections.map((section) => (
                <Card key={section.id}>
                  <CardContent className="p-4 space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      {section.title}
                    </h2>
                    {section.fields && section.fields.length > 0 ? (
                      section.fields.map((field: any) => {
                        const value = formData[field.name] ?? '';
                        const disabled = !!field.disabled;
                        switch (field.type) {
                          case 'text':
                            return (
                              <div key={field.id} className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{field.label}</label>
                                <Input
                                  value={value}
                                  onChange={e => handleChange(field.name as any, e.target.value)}
                                  placeholder={field.label}
                                  disabled={disabled}
                                />
                              </div>
                            );
                          case 'radio':
                            return (
                              <div key={field.id} className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{field.label}</label>
                                <div className="flex gap-4">
                                  {(field.options || []).map((opt: any) => (
                                    <label key={opt.value} className="flex items-center gap-1 text-base">
                                      <input
                                        type="radio"
                                        name={field.name}
                                        value={opt.value}
                                        checked={value === opt.value}
                                        onChange={() => handleChange(field.name as any, opt.value)}
                                        disabled={disabled || opt.disabled}
                                      />
                                      {opt.label}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          case 'dropdown':
                            return (
                              <div key={field.id} className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{field.label}</label>
                                <select
                                  className="border rounded px-2 py-1 text-base bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
                                  value={value}
                                  onChange={e => handleChange(field.name as any, e.target.value)}
                                  disabled={disabled}
                                >
                                  <option value="">Select</option>
                                  {(field.options || []).map((opt: any) => (
                                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          case 'checkbox':
                            return (
                              <div key={field.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!value}
                                  onChange={e => handleChange(field.name as any, e.target.checked)}
                                  disabled={disabled}
                                />
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{field.label}</label>
                              </div>
                            );
                          default:
                            return (
                              <div key={field.id} className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{field.label}</label>
                                <Input
                                  value={value}
                                  onChange={e => handleChange(field.name as any, e.target.value)}
                                  placeholder={field.label}
                                  disabled={disabled}
                                />
                              </div>
                            );
                        }
                      })
                    ) : (
                      <span className="text-gray-400">No fields</span>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <span className="text-gray-400">No checkout sections defined in settings.</span>
            )}
          </div>
        </div>
      </div>
      {/* Fixed Update Button */}
      <div className="fixed left-0 right-0 bottom-0 z-30 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-0">
        <Button
          onClick={handleUpdateOrder}
          className="w-full h-14 rounded-none bg-green-600 hover:bg-green-700 text-white border-green-700 text-base"
          disabled={cartitems.length === 0}
        >
          Update Order
        </Button>
      </div>
    </div>
  );
}