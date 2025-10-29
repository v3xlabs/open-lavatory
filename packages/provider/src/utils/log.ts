export const log = (...x: Parameters<typeof console.log>) =>
    console.log(
        '%c[provider]%c',
        'color: green; font-weight: bold',
        'color: inherit; font-weight: normal',
        ...x
    );
