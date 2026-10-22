import {PropsWithChildren} from 'react';
import UIProvider from "../UIProvider.tsx";
import ToastProvider from "../ToastProvider.tsx";
import {AuthProvider} from "../AuthProvider.tsx";

const AppProviders = ({children}: PropsWithChildren) => {
  return (
    <AuthProvider>
      <ToastProvider>
        <UIProvider>
            {children}
        </UIProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default AppProviders;