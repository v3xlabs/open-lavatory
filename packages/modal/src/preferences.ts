export interface ModalPreferences {
    autoConnect: boolean;
    sessionPrivacy: boolean;
}

export const getDefaultModalPreferences = (): ModalPreferences => ({
    autoConnect: true,
    sessionPrivacy: true,
});
