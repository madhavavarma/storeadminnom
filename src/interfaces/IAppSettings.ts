export interface IAppSettings {
  logoUrl?: string;
  branding?: {
    siteTitle?: string;
    welcomeText?: string;
    tagline?: string;
    menu?: {
      home?: string;
      products?: string;
      about?: string;
    };
    nav?: {
      contact?: { title?: string; href?: string; description?: string }[];
      faq?: { title?: string; href?: string; description?: string }[];
    };
  slides?: { image?: string; headerText?: string; contentText?: string }[];
  features?: { title?: string; description?: string; icon?: string }[];
  homeCarousels?: { heading?: string; label?: string }[];
    checkoutSections?: Array<{
      id: string;
      title: string;
      fields: Array<{
        id: string;
        name: string;
        label: string;
        type: 'text' | 'textarea' | 'radio' | 'dropdown' | 'checkbox';
        required?: boolean;
        defaultValue?: string;
        disabled?: boolean;
        options?: Array<{ label: string; value: string; disabled?: boolean }>;
      }>;
    }>;
  };
}
