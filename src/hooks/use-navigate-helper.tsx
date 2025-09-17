import { useNavigate, type NavigateFunction } from 'react-router-dom';

class NavigationHelper {
  private navigate: NavigateFunction;

  constructor(navigate: NavigateFunction) {
    this.navigate = navigate;
  }

  goToHome = () => {
    this.navigate('/');
  };

  goToProducts = (category?: string, search?: string) => {
    let queryParams = new URLSearchParams();
  
    if (category) queryParams.set("category", category);
    if (search) queryParams.set("search", search);
  
    const queryString = queryParams.toString();
    const url = queryString ? `/products?${queryString}` : "/products";
  
    this.navigate(url);
  };

  goToProductDetail = (id: string | number) => {
    this.navigate(`/product/${id}`);
  };

  goToCart = () => {
    this.navigate('/cart');
  };

  cancel = () => {
    this.navigate('/checkout');
  };

  goToThankYou = (orderId: string) => {
    this.navigate(`/thankyou?orderId=${orderId}`);
  };

  goToAboutus = () => {
    this.navigate('/aboutus');
  };

  goToFAQ = () => {
    this.navigate('/faq');
  };

  goToOrders = () => {
    this.navigate('/orders');
  };
}

export const useNavigationHelper = () => {
  const navigate = useNavigate();
  return new NavigationHelper(navigate);
};
