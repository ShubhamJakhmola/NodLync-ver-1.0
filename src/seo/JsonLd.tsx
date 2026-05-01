import { Helmet } from "react-helmet-async";

export default function JsonLd({ data }: { data: object }) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

