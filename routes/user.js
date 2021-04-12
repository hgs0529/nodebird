const express = require('express');

const { isLoggedIn } = require('./middlewares');
const User = require('../models/user');
const { addFollowing } = require('../controller/user');

const router = express.Router();

router.post('/:id/follow', isLoggedIn, addFollowing);

router.delete('/:id/follow', isLoggedIn, async (req, res, next) => {
    try {
        const user = await User.findOne({
            where: { id: req.user.id },
        });
        if (user) {
            await user.removeFollowings([parseInt(req.params.id, 10)]);
            res.send('seccess');
        }
    } catch (error) {
        res.status(404).send('no followings')
    }
})

module.exports = router;