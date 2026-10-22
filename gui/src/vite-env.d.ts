/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BROKER_API_URL: string;
    readonly VITE_REGISTER_KEY: string;
    readonly VITE_API_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
