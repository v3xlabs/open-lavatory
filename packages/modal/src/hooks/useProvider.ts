import { useModalContext } from "../context.js";

export const useProvider = () => {
  const { provider, providerStatus: status } = useModalContext();

  return {
    provider,
    status,
  };
};
