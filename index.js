const express = require('express');
const cors = require('cors'); // Make sure to install: npm install cors
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const path = require('path');

// Improved CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost',
    'http://188.166.215.120:3000',
    'http://your-frontend-domain.com' // Add your production frontend URL
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware Setup
app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.set('view engine', 'ejs');
app.set('trust proxy', 1);

// Enhanced logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Rate limiting with better configuration
const limiter = rateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 800,
    message: 'Too many requests from this IP, please try again later',
    headers: true
});
app.use(limiter);

// Security headers middleware
app.use((req, res, next) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    next();
});

// Routes
app.all('/favicon.ico', (req, res) => res.status(204).end());

app.all('/player/register', (req, res) => {
    res.send("Coming soon...");
});

// Improved login dashboard with error handling
app.all('/player/login/dashboard', (req, res) => {
    const tData = {};
    try {
        if (req.body) {
            const bodyString = JSON.stringify(req.body);
            const uData = bodyString.split('"')[1].split('\\n');
            const uName = uData[0].split('|');
            const uPass = uData[1].split('|');
            
            for (let i = 0; i < uData.length - 1; i++) {
                const d = uData[i].split('|');
                if (d.length >= 2) {
                    tData[d[0]] = d[1];
                }
            }
            
            if (uName[1] && uPass[1]) {
                return res.redirect('/player/growid/login/validate');
            }
        }
    } catch (why) {
        console.error(`Error processing login: ${why}`);
    }

    res.render(path.join(__dirname, 'public/html/dashboard.ejs'), {data: tData});
});

// Enhanced validation endpoint
app.all('/player/growid/login/validate', (req, res) => {
    try {
        const { _token, growId, password, email } = req.body;
        
        if (!growId || !password) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields"
            });
        }

        const tokenData = `_token=${_token}&growId=${growId}&password=${password}&email_reg=${email || ''}` + 
                         (email ? '&has_reg=1' : '&has_reg=0');
                        
        const token = Buffer.from(tokenData).toString('base64');
        
        res.json({
            status: "success",
            message: "Account Validated.",
            token: token,
            url: "",
            accountType: "growtopia",
            accountAge: 2
        });
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            status: "error",
            message: "Internal server error"
        });
    }
});

// Improved token checking
app.all('/player/growid/checktoken', (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).render(path.join(__dirname, 'public/html/dashboard.ejs'));
        }

        const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
        
        if (!decoded.startsWith('growId=') || !decoded.includes('passwords=')) {
            return res.render(path.join(__dirname, 'public/html/dashboard.ejs'));
        }

        res.json({
            status: 'success',
            message: 'Account Validated.',
            token: refreshToken,
            url: '',
            accountType: 'growtopia',
            accountAge: 2
        });
    } catch (error) {
        console.error("Token check error:", error);
        res.render(path.join(__dirname, 'public/html/dashboard.ejs'));
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Something broke!' });
});

// Start server
app.listen(5000, () => {
    console.log('Server is running on port 5000');
    console.log('CORS-enabled for:', corsOptions.origin);
});