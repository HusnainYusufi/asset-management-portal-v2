import type { Easing } from "motion/react";

export type VariantsType = {
	durationIn?: number;
	durationOut?: number;
	easeIn?: Easing;
	easeOut?: Easing;
	distance?: number;
};

export type TranHoverType = {
	duration?: number;
	ease?: Easing;
};
export type TranEnterType = {
	durationIn?: number;
	easeIn?: Easing;
};
export type TranExitType = {
	durationOut?: number;
	easeOut?: Easing;
};

export type BackgroundType = {
	duration?: number;
	ease?: Easing;
	colors?: string[];
};
