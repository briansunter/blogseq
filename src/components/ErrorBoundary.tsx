import React, { ErrorInfo, ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Error caught by boundary:", error, info);
		this.props.onError?.(error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="p-4 bg-red-50 border border-red-200 rounded">
						<p className="text-red-800 font-semibold">Something went wrong</p>
						<p className="text-sm text-red-700 mt-1">{this.state.error?.message}</p>
					</div>
				)
			);
		}

		return this.props.children;
	}
}
