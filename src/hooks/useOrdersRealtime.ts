import { useEffect } from "react";
import { supabase } from "@/supabaseClient";

export function useOrdersRealtime(onChange: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          onChange();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);
}
