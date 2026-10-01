import React, {
	createContext,
	FC,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";

interface Toast {
	id: string;
	message: string;
	type: "info" | "success" | "error" | "warning";
	duration?: number;
}

interface ToastContextType {
	toasts: Toast[];
	addToast: (message: string, type?: Toast["type"], duration?: number) => void;
	removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const nextId = useRef(0);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const addToast = useCallback(
		(message: string, type: Toast["type"] = "info", duration = 4000) => {
			const id = String(nextId.current++);
			setToasts((prev) => [...prev, { id, message, type, duration }]);

			if (duration > 0) {
				setTimeout(() => removeToast(id), duration);
			}
		},
		[removeToast],
	);

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
			{children}
			<ToastContainer toasts={toasts} onRemove={removeToast} />
		</ToastContext.Provider>
	);
};

export const useToast = () => {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within ToastProvider");
	}

	const { addToast } = context;
	return useMemo(
		() => ({
			showSuccess: (msg: string) => addToast(msg, "success"),
			showError: (msg: string) => addToast(msg, "error"),
			showWarning: (msg: string) => addToast(msg, "warning"),
			showInfo: (msg: string) => addToast(msg, "info"),
		}),
		[addToast],
	);
};

const ToastContainer: FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({
	toasts,
	onRemove,
}) => {
	const bgColor = {
		info: "bg-blue-50 border-blue-200",
		success: "bg-green-50 border-green-200",
		error: "bg-red-50 border-red-200",
		warning: "bg-yellow-50 border-yellow-200",
	};

	const textColor = {
		info: "text-blue-800",
		success: "text-green-800",
		error: "text-red-800",
		warning: "text-yellow-800",
	};

	return (
		<div className="fixed bottom-4 right-4 space-y-2 z-50">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`p-3 border rounded shadow-sm ${bgColor[toast.type]} ${textColor[toast.type]} animate-in fade-in slide-in-from-right`}
				>
					<div className="flex items-center justify-between">
						<span>{toast.message}</span>
						<button
							onClick={() => onRemove(toast.id)}
							className="ml-2 text-sm opacity-70 hover:opacity-100"
						>
							✕
						</button>
					</div>
				</div>
			))}
		</div>
	);
};
