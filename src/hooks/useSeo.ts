import { useEffect } from "react";

export function useSeo(title?: string, description?: string) {
  useEffect(() => {
    const baseTitle = "NodLync";
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", description);
      } else {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        metaDesc.setAttribute("content", description);
        document.head.appendChild(metaDesc);
      }
      
      // Also update OG tags
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", description);
    }
    
    // Update OG Title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title || baseTitle);
    
  }, [title, description]);
}
