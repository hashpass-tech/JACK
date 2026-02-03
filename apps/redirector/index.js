const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('*', (req, res) => {
    res.redirect(301, 'https://lukas.lat' + req.path);
});

app.listen(port, () => {
    console.log(`Redirector listening on port ${port}`);
});
