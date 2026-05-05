import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

const SPEC_URL =
  process.env.NEXT_PUBLIC_API_SPEC_URL ||
  "https://app.recuring.in/api/mobile/v1/openapi.json";

export function ApiReference() {
  return (
    <SwaggerUI
      url={SPEC_URL}
      deepLinking
      displayOperationId={false}
      defaultModelsExpandDepth={-1}
    />
  );
}
