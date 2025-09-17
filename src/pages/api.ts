// Cancel order by id (set status to 'Cancelled')
export async function deleteOrder(id: string | number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'Cancelled' })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error cancelling order:', err);
    return false;
  }
}
import productsMock from '../assets/json/MotherEarth/products.json';
import categoriesMock from '../assets/json/MotherEarth/categories.json';
import appSettingsMock from '../assets/json/MotherEarth/appSettings.json';
import { supabase } from '@/supabaseClient';
import type { IProduct } from '@/interfaces/IProduct';
import type { ICategory } from '@/interfaces/ICategory';
import type { IAppSettings } from '@/interfaces/IAppSettings';
import type { ICartState } from '@/store/interfaces/ICartState';
import type { IOrder } from '@/store/OrdersSlice';

const isMock = false; // toggle to switch between mock data and supabase

// prepare sql scripts for supabase
// create schema, insert sample data
// prepare sample data from json files

// pickup drop time to be in checkout
// pickup drop in checkout page (new card)
// notes in checkout page

export const getProducts = async (): Promise<IProduct[]> => {
  if (isMock) {
    return productsMock;
  } else {
    const { data, error } = await supabase
  .from("products")
  .select(`
    *,
    productimages(*),
    productdescriptions(*),
    productvariants(
      *,
      productvariantoptions(*)
    )
  `)
  .eq("ispublished", true);

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  // 🛠️ Map productImages into a simple array of urls
  const mapped: IProduct[] = (data || []).map((product: any) => ({
    ...product,
    image: product.productimages && product.productimages.length > 0
      ? product.productimages[0].url
      : undefined,
    imageUrls: product.productimages
      ? product.productimages.map((img: any) => img.url)
      : [],
  }));

  // console.log(mapped)

  return mapped;
  }
};

export const getCategories = async (): Promise<ICategory[]> => {
  if (isMock) {
    return categoriesMock;
  } else {
    return (await supabase
      .from("categories")
      .select("*")).data as ICategory[];
  }
};

export const getAppSettings = async (): Promise<IAppSettings> => {
  if (isMock) {
    return appSettingsMock;
  } else {
    const { data, error } = await supabase
      .from("branding")
      .select("data")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
      console.error("Error fetching app settings:", error.message);
      throw new Error(error.message);
    }

    if (!data) {
      // Insert a default empty object
      const defaultSettings = {};
      const { error: insertError } = await supabase.from("branding").insert([{ data: defaultSettings }]);
      if (insertError) {
        console.error("Error inserting default app settings:", insertError.message);
        throw new Error(insertError.message);
      }
      return defaultSettings as IAppSettings;
    }

    // data.data is JSONB column
    return data.data as IAppSettings;
  }
};

export async function createOrder(cartState: ICartState) {
  if(isMock) {
    return cartState;
  } else {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      throw new Error('User not authenticated');
    }
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          cartitems: cartState.cartitems,
          totalquantity: cartState.totalquantity,
          totalprice: cartState.totalprice,
          checkoutdata: cartState.checkoutdata,
          userid: user.id,
          status: cartState.status || 'Pending' // Capitalized to match enum/UI
        }
      ])
      .select(); // return inserted row(s)

    if (error) {
      console.error('Error creating order:', error);
      return null;
    }

  // console.log('Order created:', data);

    return data[0];
  }
}

export async function getOrders(): Promise<IOrder[] | null> {
  if(isMock) {
    return [];
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching orders:', error);
    return null;
  }
  return data as IOrder[];
}

export async function updateOrder(id: string, updates: Partial<IOrder>): Promise<IOrder | null> {

  if(isMock) {
    return null;
  }

  // Remove id from updates to avoid updating identity column
  const { id: _id, ...rest } = updates;
  const updatesToSend = {
    ...rest,
    cartitems: updates.cartitems,
  };
  // console.log("Updating order:", id, updatesToSend);
  const { data, error } = await supabase
    .from("orders")
    .update(updatesToSend)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating order:", error);
    return null;
  }

  return data as IOrder;
}