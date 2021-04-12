const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const hpp = require('hpp');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const passport = require('passport')
const redis = require('redis');
const RedisStore = require('connect-redis')(session);

dotenv.config()
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD,
});
const { sequelize } = require('./models');
const passportConfig = require('./passport');
const logger = require('./logger');
const pageRouter = require('./routes/page');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const postRouter = require('./routes/post');



const app = express()

app.set('port', process.env.PORT || 3070);
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});
sequelize.sync({ force: false})
    .then(() => {
        console.log('데이터베이스 연결 성공');
    })
    .catch((err) => {
        console.error(err);
    })
passportConfig()

if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
    app.enable('trust proxy');
    app.use(hpp());
    app.use(helmet({ contentSecurityPolicy: false }));
} else {
    app.use(morgan('dev'))
};

app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
const sessionOption = {
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
    },
    store: new RedisStore({ client: redisClient }) // 기본값은 서버 메모리
};
if(process.env.NODE_ENV === 'production') {
    sessionOption.proxy = true;
    // sessionOption.cookie.secure = true; // https 적용할떄 true 로 바꿔줌
}
app.use(session(sessionOption));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', pageRouter);
app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/post', postRouter);


app.use((req, res, next) => {
    const error = new Error(`${req.method}${req.url} 라우터가 없습니다.`);
    error.status = 404;
    logger.info('hello');
    logger.error(error.message)
    next(error);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;