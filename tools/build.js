({
    appDir: '../phonegap/www',
    baseUrl: 'js',
    dir: '../phonegap/www-built',
    paths: {
        'socket.io': 'empty:',
        'browserId': 'empty:'
    },
    modules: [
        {
            name: 'index',
            exclude: ['socket.io', 'browserId']
        }
    ]
})
