import { Helmet } from "react-helmet-async";

export default function Analytics() {
  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

  return (
    <Helmet>
      {plausibleDomain && (
        <script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" />
      )}
      {gaId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script>
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
          </script>
        </>
      )}
    </Helmet>
  );
}

