import '@/styles/store.css';
import { StoreProvider } from '@/components/store/StoreProvider';
import { CookieConsent } from '@/components/store/CookieConsent';
import { Motion } from '@/components/store/Motion';
import { StoreError } from '@/components/store/StoreError';
import { loadStorefront } from '@/lib/catalog';
import { maybeMarkDropLive } from '@/lib/drops';
import { getLang } from '@/lib/lang';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  let data;
  try {
    data = await loadStorefront();
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
        <Motion />
      </StoreProvider>
    </div>
  );
}
