const express = require('express');
const router = express.Router();
const request = require('request-promise');

router.get("/", function(req, res) {
    res.render("feedback", {
        error: req.error,
        url: req.query,
        title: "Feedback",
        success: req.success
    });
});

router.post("/send", function(req, res) {
    const captcha = req.body["g-recaptcha-response"];
    request({
        url: "https://www.google.com/recaptcha/api/siteverify",
        form: {
            secret: process.env.CAPTCHA_SECRET,
            response: captcha
        },
        method: "POST"
    }, (e, r, b) => {
        const bJson = JSON.parse(b);
        if (bJson.success) {
            const text = `❗ *New Feedback entry!*\n\n*Topic:*\n${req.body["topic"]}\n\n*Username:*\n${req.body["name"]}\n\n*Comment:*\n${req.body["comment"]}`;
            request({
                url: `https://api.telegram.org/bot${process.env.BOT_KEY}/sendMessage`,
                form: {
                    chat_id: process.env.FEEDBACK_CHAT_ID,
                    text: text,
                    parse_mode: "Markdown",
                }, 
                method: "POST"
            }, (e, r, b) => {
                const body = JSON.parse(b);
                if (body.ok) {
                    req.session.success = "Successfully sent!";
                    res.redirect("/feedback");
                } else {
                    req.session.error = "Something went wrong!";
                    res.redirect("/feedback");
                }
            })
        } else {
            req.session.error = "Recaptcha error! Please try again!";
            res.redirect("/feedback");
        }
    })
})

module.exports = router;