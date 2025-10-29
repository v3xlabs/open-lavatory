export const log = (...x: Parameters<typeof console.log>) =>
    console.log(
        '%c[modal]%c',
        'color: yellow; font-weight: bold',
        'color: inherit; font-weight: normal',
        ...x
    );
