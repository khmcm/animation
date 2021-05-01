/**
 * @description Converts a CSS color (currently hex, rgb, and
 *              rgba into an object containing the r, g, b,
 *              (and possibly a) values
 */
function extractColorAsRgb(color: string): IRgbColor {
    let rgba: IRgbColor | undefined;
    let rgb: {r: number, g: number, b: number} | undefined;
    let hex: TColorTriple | undefined;

    const formattedColor: string = color.toLowerCase().trim();

    /* @ts-ignore */
    formattedColor.replace(/rgb\s?\(([0-9]{1,3})\s?,\s?([0-9]{1,3})\s?,\s?([0-9]{1,3}),\s?([0-9]{1,3})\s?\)/, ($0: string, $1: string, $2: string, $3: string, $4: string) => {
        rgba = {
            r: parseInt($1),
            g: parseInt($2),
            b: parseInt($3),
            a: parseInt($4)
        }
    });

    if(rgba) {
        return rgba;
    }
    
    if(!rgba) {
        /* @ts-ignore */
        formattedColor.replace(/rgb\s?\(([0-9]{1,3})\s?,\s?([0-9]{1,3})\s?,\s?([0-9]{1,3})\s?\)/, ($0: string, $1: string, $2: string, $3: string) => {
            rgb = {
                r: parseInt($1),
                g: parseInt($2),
                b: parseInt($3)
            }
        });
    }

    if(rgb) {
        return rgb;
    }

    if(formattedColor.match(/^#[a-f0-9]{6}$/)) {
        hex = <TColorTriple>[
            color.substring(1,3),
            color.substring(3,5),
            color.substring(5,7)
        ].map((segment: string) => parseInt(segment, 16));

        return {
            r: hex[0],
            g: hex[1],
            b: hex[2]
        }
    }

    throw new Error(`Format not recognized (must be rgb, rgba, hex)`);
}

type TColorTriple = [number, number, number];

interface IRgbColor {
    r: number,
    g: number,
    b: number
    a?: number
}
interface IRgbaColor {
    r: number,
    g: number,
    b: number
}

interface IAnimationIteratorArgs {
    rate?     : number;
    interval? : number;
    time?     : number;
    func?     : TAnimationIteratorFunc;
    function? : TAnimationIteratorFunc;
}

interface IAnimationIteratorListener {
    callback: TAnimationIteratorListenerCallback
}

interface IAnimationIteratorFuncResult {styles:{[index: string]: string}, progress: number};

type TAnimationIteratorListenerCallback = (state: IAnimationIteratorFuncResult) => void;

type TAnimationIteratorFunc = (initialState: any, time: number) => IAnimationIteratorFuncResult;

type TAnimationIteratorSubscriber = (state: IAnimationIteratorFuncResult) => void;

/**
 * @description Creates a callback for an animation iterator that
 *              handles updating of the element's styles in response
 *              to the raising of its listener
 */
function createElementSub(selector: string): TAnimationIteratorSubscriber {
    const el: HTMLElement = <HTMLElement>window.document.querySelector(selector);
    return (state: IAnimationIteratorFuncResult) => {
        const stateKeys: string[] = Object.keys(state.styles);
        for(let stateKey of stateKeys) {
            el.style.setProperty(stateKey, state.styles[stateKey]);
        }
    }
}

const DEFAULT_STEP_INTERVAL: number = 1/180,
      DEFAULT_FRAME_RATE   : number = 60,
      DEFAULT_PROGRESS     : number = 0.0,
      DEFAULT_TIME         : number = 0.0,
      DEFAULT_LAST_TICK    : number = 0.0,
      DEFAULT_FUNC         : TAnimationIteratorFunc = (initialState: null, time: number) => ({
          styles: {},
        progress: time
      });
    
function conditionalDefault<T>(value: T | undefined, defaultValue: T): T {
    if(typeof value === 'undefined' || value === null) {
        return defaultValue;
    } else {
        return value;
    }
}

/** 
 * @description Handles the initiation, iteration, and listeners
 *              for a single animation
 */
class AnimationIterator {
    private interval : number = DEFAULT_STEP_INTERVAL;
    private rate     : number = DEFAULT_FRAME_RATE;
    private progress : number = DEFAULT_PROGRESS;
    private time     : number = DEFAULT_TIME;
    private lastTick : number = DEFAULT_LAST_TICK;
    private func     : TAnimationIteratorFunc = DEFAULT_FUNC;
    private listeners: IAnimationIteratorListener[] = [];

    /**
     * @description Resets everything in the animation iterator
     *              except the listeners
     */
    reset: () => void;

    constructor(args: IAnimationIteratorArgs) {
        this.reset = () => {
            this.interval  = conditionalDefault<number>(args.interval                              , DEFAULT_STEP_INTERVAL);
            this.rate      = conditionalDefault<number>(args.rate                                  , DEFAULT_FRAME_RATE);
            this.func      = conditionalDefault<TAnimationIteratorFunc>(args.func || args.function , DEFAULT_FUNC);
            this.progress  = DEFAULT_PROGRESS;
            this.time      = DEFAULT_TIME;
            this.lastTick  = DEFAULT_LAST_TICK;
        }

        this.reset();
    }

    /**
     * @description Resets any listeners attached to the
     *              animation iterator
     */
    resetListeners() {
        this.listeners = [];
    }

    /**
     * @description Resets the entire animation iterator
     */
    resetAll() {
        this.reset();
        this.resetListeners();
    }

    /**
     * @description Runs a single tick in the iterator
     */
    next(initialState: any): void {
        if(Date.now() - this.lastTick >= 1000 / this.rate) {
            this.lastTick = Date.now();
        } else {
            window.requestAnimationFrame(() => this.next(initialState));
            return;
        }

        this.time += this.interval;

        const nextState: IAnimationIteratorFuncResult = this.func(initialState, this.time);

        if(nextState.progress >= 1.0) {
            nextState.progress = 1.0;
        }

        this.progress = nextState.progress;

        this.listeners.forEach((listener: IAnimationIteratorListener) => {
            if(listener) {
                listener.callback(nextState);
            }
        });

        if(this.progress >= 1) {
            return;
        }

        window.requestAnimationFrame(() => this.next(initialState));
    }

    /**
     * @description Adds a listener callback to the listeners array
     */
    subscribe(callback: TAnimationIteratorListenerCallback): () => void {
        //Fill in any empty array index with
        //the subscription listener function
        for(let i = 0; i < this.listeners.length; i++) {
            if(!this.listeners[i]) {
                this.listeners[i] = {callback};
                return () => {
                    delete this.listeners[i];
                }
            }
        }

        //If there is no empty array index, then create a new array
        //index and fill it with the subscription listener function
        const index = this.listeners.length;
        this.listeners.push({callback});

        //Return the unsubscribing function
        return () => {
            delete this.listeners[index];
        }
    }

    /**
     * @description Starts the animation update loop
     */
    start(initialState: any): Promise<void> {
        return new Promise((resolve: Function, reject: Function) => {
            window.requestAnimationFrame(() => this.next(initialState));
            const unsubscribe = this.subscribe((state: IAnimationIteratorFuncResult) => {
                if(state.progress === 1.0) {
                    unsubscribe();
                    resolve(state);
                }
            })
        });
    }
}

export {
    AnimationIterator,
    createElementSub,
    extractColorAsRgb,
    IAnimationIteratorArgs,
    IAnimationIteratorFuncResult,
    IAnimationIteratorListener,
    TColorTriple,
    IRgbColor,
    IRgbaColor,
    DEFAULT_STEP_INTERVAL,
    DEFAULT_FRAME_RATE,
    DEFAULT_PROGRESS,
    DEFAULT_TIME,
    DEFAULT_LAST_TICK,
    DEFAULT_FUNC
}