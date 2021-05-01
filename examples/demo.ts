import {
    AnimationIterator,
    createElementSub,
    extractColorAsRgb,
    IRgbColor
} from '../src/index'

const ai: AnimationIterator = new AnimationIterator({
    rate: 60,
    interval: 0.007,
    func: (initialState: {left: number, background: IRgbColor}, time: number) => ({
        styles: {
            left: `${time ** 2 * 400 + initialState.left}px`,
            background: `rgb(${Math.floor(initialState.background.r + (255-initialState.background.r)*time)},${initialState.background.g},${initialState.background.b})`
        },
        progress: time ** 2
    })
});

const unsubscribe = ai.subscribe(createElementSub('.square'));
const square: HTMLDivElement = <HTMLDivElement>window.document.querySelector('.square');

async function startAnimation() {
    const initialSquareLeft: string = getComputedStyle(square).getPropertyValue('left');
    const initialSquareBackgroundColor: string = getComputedStyle(square).getPropertyValue('background-color');

    await ai.start({
        left: parseInt((getComputedStyle(square).getPropertyValue('left'))),
        background: extractColorAsRgb(getComputedStyle(square).getPropertyValue('background-color'))
    });

    ai.reset();
    square.style.setProperty('left', initialSquareLeft);
    square.style.setProperty('background-color', initialSquareBackgroundColor);
    window.alert('Animation complete!');
}

(<HTMLElement>window.document.querySelector('.square')).addEventListener('click', startAnimation);