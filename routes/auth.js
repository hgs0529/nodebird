const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const passport = require('passport');

const { isLoggedIn, isNotLoggedIn } = require('./middlewares');

const router = express.Router();

router.post('/join', isNotLoggedIn, async (req, res, next) => {
    const { email, password, nick} = req.body;
    try {
        const exUser = await User.findOne({ where: { email } });
        if (exUser) {
            return res.redirect('/join?error=exist');
        }
        const hash = await bcrypt.hash(password, 12);
        await User.create({
            email,
            nick,
            password: hash,
        });
        return res.redirect('/')
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.post('/login', isNotLoggedIn, (req, res, next) => {
    passport.authenticate('local', (authErr, user, info) => {
        if(authErr) {
            console.error(authErr);
            return next(authErr)
        }
        if(!user) {
            return res.redirect(`/?loginError=${message}`)
        }
        return req.login(user, (loginError) => {
            if(loginError) {
                console.error(loginError);
                return next(loginError);
            }
            return res.redirect('/');
        });
    })(req, res, next);
})

router.get('/logout', isLoggedIn, (req, res,next) => {
    req.logOut();
    req.session.destroy();
    res.redirect('/');
})

module.exports = router;