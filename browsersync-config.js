module.exports = {
    open: false,
    server: "dist",
    notify: false,
    ghostMode: false,
    https: {
        cert: './dist/cert.pem',
        key: './dist/key.pem'    
    }
};
