/* eslint-disable @typescript-eslint/no-explicit-any */
import { TActionType, TFilterOptions, TNotifs } from "@/types";
import { SORT_ORDER } from "./enums";

export function ReusableReducer<T = TFilterOptions>(
	state: T,
	action: TActionType<T>
): T {
	return { ...state, ...action.payload };
}
export const FILTEROPTIONS: TFilterOptions & Record<string, any> = {
	order: { direction: SORT_ORDER.Ascending, orderField: '' },
	date: [],
	term: '',
};

export const baseFactoryReducer = <S>(state: S, action: TActionType<S>): S => ({
	...state,
	...action.payload,
});


export const SAMPLE_NOTIFS: TNotifs[] = [
	{
		type: 'message',
		avatar:
			'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
		message:
			'New message from Jese Leos: "Hey, what\'s up? All set for the presentation?"',
		time: 'a few moments ago',
		unread: true,
		color: 'bg-blue-600',
	},
	{
		type: 'follow',
		avatar:
			'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
		message: 'Joseph Mcfall and 5 others started following you.',
		time: '10 minutes ago',
		unread: true,
		color: 'bg-gray-900',
	},
	{
		type: 'like',
		avatar:
			'https://images.unsplash.com/photo-1494790108755-2616b332c363?w=150&h=150&fit=crop&crop=face',
		message:
			'Bonnie Green and 141 others love your story. See it and view more stories.',
		time: '44 minutes ago',
		unread: false,
		color: 'bg-red-600',
	},
	{
		type: 'mention',
		avatar:
			'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
		message:
			'Leslie Livingston mentioned you in a comment: @bonnie.green what do you say?',
		time: '1 hour ago',
		unread: false,
		color: 'bg-green-400',
	},
	{
		type: 'video',
		avatar:
			'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
		message:
			'Robert Brown posted a new video: Glassmorphism - learn how to implement the new design trend.',
		time: '3 hours ago',
		unread: false,
		color: 'bg-purple-500',
	},
].map((notif: TNotifs, id) => ({ ...notif, id: `${id}` }));