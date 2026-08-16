import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import CustomAlert from '../components/CustomAlert';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
    const [alertConfig, setAlertConfig] = useState(null);

    const showAlert = useCallback(({
        title,
        message,
        onConfirm,
        onCancel,
        confirmText,
        cancelText,
        type = 'info'
    }) => {
        setAlertConfig({
            title,
            message,
            onConfirm: () => {
                setAlertConfig(null);
                if (onConfirm) onConfirm();
            },
            onCancel: onCancel ? () => {
                setAlertConfig(null);
                if (onCancel) onCancel();
            } : null,
            confirmText,
            cancelText,
            type
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertConfig(null);
    }, []);

    const value = useMemo(() => ({
        alert: showAlert,
        hide: hideAlert
    }), [showAlert, hideAlert]);

    return (
        <AlertContext.Provider value={value}>
            {children}
            {alertConfig && (
                <CustomAlert
                    visible={!!alertConfig}
                    {...alertConfig}
                />
            )}
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
