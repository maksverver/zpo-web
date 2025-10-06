import React, { type ErrorInfo, type ReactNode } from "react";

type Props = {
    children: ReactNode;
    fallback: ReactNode;
};

type State = {
    lastError: Error|null;
};

// Borrowed from:
// https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
export class ErrorBoundary extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            lastError: null,
        };
    }

    static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show the fallback UI.
        return { lastError: error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(
            error,
            // Example "componentStack":
            //   in ComponentThatThrows (created by App)
            //   in ErrorBoundary (created by App)
            //   in div (created by App)
            //   in App
            errorInfo.componentStack,
            // Warning: `captureOwnerStack` is not available in production.
            React.captureOwnerStack(),
        );
    }

    render() {
        const {lastError} = this.state;
        if (lastError != null) {
            // You can render any custom fallback UI
            return this.props.fallback;
        }
        return this.props.children;
    }
}
