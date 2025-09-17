export interface ICheckout {
    phone: string;
    email: string;
    whatsapp: string;
    address: string;
    city: string;
    pincode: string;
    paymentMethod: "cod" | "upi";
  }