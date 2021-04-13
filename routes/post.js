const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const { Post, Hashtag, User } = require('../models');
const { isLoggedIn } = require('./middlewares');

const router = express.Router()

try {
    fs.readdirSync('uploads');
} catch (err) {
    console.error('uploads 폴더가 없어서 uploads 폴더를 생성합니다');
    fs.mkdirSync('uploads');
}

AWS.config.update({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: 'ap-northeast-2',
})
const upload = multer({
    storage: multerS3({
        s3: new AWS.S3(),
        bucket: 'nodebird40',
        key(req, file, cb) {
            cb(null, `original/${Date.now()}${path.basename(file.originalname)}`)
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/img', isLoggedIn, upload.single('img'), (req, res) => {
    console.log(req.file);
    res.json({ url: req.file.location })
});

router.post('/:id/like', isLoggedIn, async (req, res, next) => {
    try {
        const twitId = parseInt(req.params.id, 10);
        const post = await Post.findOne({ where: { id: twitId } });
        await post.addLiker(req.user.id);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.post('/:id/unlike', isLoggedIn, async (req, res, next) => {
    try {
        const twitId = parseInt(req.params.id, 10);
        const post = await Post.findOne({ where: { id: twitId } });
        console.log(post)
        await post.removeLiker(req.user.id)
        res.redirect('/')
    } catch (error) {
        console.error(error)
    }
})


router.post('/', isLoggedIn, upload.none(), async (req, res, next) => {
    try {
        const hashtagObj = new Set(req.body.content.match(/#[^\s#]*/g));
        const hashtags = Array.from(hashtagObj);
        let content = req.body.content;
        hashtags.forEach(tag => { //해시태그마다 a태그 달아줌
            content = content.replace(tag, `<a href="http://localhost:3070/hashtag?hashtag=${tag.slice(1).toLowerCase()}">${tag}</a>`)
        })
        const post = await Post.create({
            content,
            img: req.body.url,
            UserId: req.user.id,
        });
        console.log('2', hashtags);
        if (hashtags) {
            const result = await Promise.all(
                hashtags.map(tag => {
                    return Hashtag.findOrCreate({
                        where: { title: tag.slice(1).toLowerCase() },
                    })
                }),
            );
            console.log(result);
            await post.addHashtags(result.map(f => f[0]))
        }
        res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
});


// 포스트 삭제
router.delete('/:id/delete', async (req, res, next) => {
    try {
        const twitId = parseInt(req.params.id, 10)
        const post = await Post.findAll({ where: { id: twitId } });
        if (req.user.id === post[0].UserId) {
            const hashtags = await post[0].getHashtags()
            hashtags.forEach(async tag => { // 이 포스트에 달린 해시태그 하나하나 이 포스트와 관게를 제거
                await post[0].removeHashtags([tag])
                const hashcheck = await tag.getPosts() // 해시태그가 다른 관계가 있는 포스팅이 있는지 검사
                if (!hashcheck.length) { // 관계가 있는 다른 포스트가 없다면 삭제
                    await Hashtag.destroy({ where: { id: tag.id } });
                }
            });
            await Post.destroy({
                where: { id : twitId }
            })
            res.send('seccess');
        }
    } catch (error) {
        console.error(error)
        res.status(500).send('계시글 작성자가 아님')
    }
});

// 닉네임 변경
router.post('/edit-profile', isLoggedIn, async (req, res, next) => {
    try {
        await User.update({nick: req.body.nick},{ where: { id: req.user.id }});
        res.redirect('/profile')
    } catch (error) {
        console.error(error);
    }
})

module.exports = router;