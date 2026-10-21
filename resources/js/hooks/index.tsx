/* eslint-disable @typescript-eslint/no-unused-expressions */
import { TCustomDialogPropsContextProps, TDebounceprops, TKeyValueAnyType } from "@/types";
import { baseFactoryReducer } from "@/utils/constants";
import { useReducer, useRef, useState } from "react";

export const useDebounce = <T,>({
	debounceTimeOut = 500,
	debounceCallback,
}: TDebounceprops<T>) => {
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

	return (args: T) => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);

		timeoutRef.current = setTimeout(() => {
			debounceCallback(args);
		}, debounceTimeOut);
	};
};

export const useCustomDialogContextFactory = <T = TKeyValueAnyType, >() => {
	const [dialogOpen, toggleDialogState] = useState<boolean>(false);

	const [dialogContent, dialogContentDispatcher] = useReducer(
		baseFactoryReducer<TCustomDialogPropsContextProps<T>>,
		{}
	);
	const toggleDialog = (state?: boolean) =>
		toggleDialogState((prev) => state ?? !prev);
	const handleDialogContextSwitch = ({
		componentProps,
		Component,
		state,
	}: TCustomDialogPropsContextProps<T>) => {
		Component
			? dialogContentDispatcher({
					payload: {
						...(componentProps ? { componentProps } : {}),
						Component,
					},
					type: 'componentProps',
			  })
			: null;

		toggleDialog(state);
	};
	return {
		handleDialogContextSwitch,
		dialogContent,
		toggleDialog,
		dialogOpen,
	};
};
