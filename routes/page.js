const express = require('express');
const { Post, User, Hashtag } = require('../models');

const router = express.Router();

router.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.followerCount = req.user ? req.user.Followers.length : 0;
    res.locals.followingCount = req.user ? req.user.Followings.length : 0;
    res.locals.followerIdList = req.user ? req.user.Followings.map(f => f.id) : [];
    res.locals.LikePostList = req.user ? req.user.LikePost.map(f => f.id) : [];
    next();
});

router.get('/profile', (req, res) => {
    res.render('profile', { title: '내 정보 - NodeBird' });
});

router.get('/join', (req, res) => {
    res.render('join', { title: '회원가입 - NodeBird'});
});

router.get('/hashtag', async (req, res, next) => {
    const query = req.query.hashtag;
    console.log('1', query)
    if(!query) {
        return res.redirect('/');
    }
    try {
        const hashtag = await Hashtag.findOne({ where: { title: query } });
        console.log('2',hashtag)
        let posts = [];
        if (hashtag) {
            posts = await hashtag.getPosts({ include: [{
                model: User,
                attributes: ['id', 'nick']
            }]});
        }
        console.log(hashtag)
        return res.render('main', {
            title: `${query} 검색결과 | NodeBird`,
            twits: posts,
        })
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.get('/', async(req, res, next) => {
    try {
        console.log(req.user)
        const posts = await Post.findAll({
            include: [{
                model: User,
                attributes: ['id', 'nick']
            }, {
                model: User,
                attributes: ['id', 'nick'],
                as: 'Liker'
            }],
            order: [['createdAt', 'DESC']],
        });
        res.render('main', {
            title: 'NodeBird',
            twits: posts,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;