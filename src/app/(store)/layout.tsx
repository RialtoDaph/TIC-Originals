import '@/styles/store.css';
import { StoreProvider } from '@/components/store/StoreProvider';
import { CookieConsent } from '@/components/store/CookieConsent';
import { StoreError } from '@/components/store/StoreError';
import { createPublicClient } from '@/lib/supabase/public';
import { loadCurrentDrop, loadProducts, loadSettings } from '@/lib/catalog';
import { maybeMarkDropLive } from '@/lib/drops';
import { getLang } from '@/lib/lang';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  let data;
  try {
    const supabase = createPublicClient();
    const [products, settings, drop] = await Promise.all([
      loadProducts(supabase),
      loadSettings(supabase),
      loadCurrentDrop(supabase),
    ]);
    data = { products, settings, drop };
  } catch (e) {
    console.error('storefront data failed to load', e);
    return (
      <div className="store-root">
        <StoreError lang={lang} />
      </div>
    );
  }
  if (data.drop) await maybeMarkDropLive(data.drop);

  return (
    <div className="store-root">
      <StoreProvider initialLang={lang} settings={data.settings} products={data.products} drop={data.drop}>
        {children}
        <CookieConsent />
      </StoreProvider>
    </div>
  );
}
