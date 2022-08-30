import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Container } from "@mui/system";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Container
      sx={{
        padding: "16px 0",
      }}
    >
      <Component {...pageProps} />
    </Container>
  );
}

export default MyApp;
