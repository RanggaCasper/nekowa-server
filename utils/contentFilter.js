const fs = require('fs');
const path = require('path');

class ContentFilter {
    constructor() {
        this.badWords = [
            // Indonesian bad words - Tier 1 (Most severe)
            'anjing', 'bangsat', 'babi', 'kampret', 'tolol', 'bodoh', 'goblok', 'idiot',
            'kontol', 'memek', 'ngentot', 'jancok', 'bajingan', 'sialan', 'keparat',
            'asu', 'monyet', 'setan', 'iblis', 'celaka', 'laknat', 'brengsek',
            'kimak', 'peler', 'titit', 'toket', 'nenen', 'pepek', 'perek',
            'jancuk', 'tempik', 'cukimai', 'bangke', 'anjrit', 'anying',
            'cibai', 'pantek', 'pukimak', 'lancau', 'kancut', 'pentil',
            'entot', 'colmek', 'coli', 'onani', 'remes', 'crotin', 'crot',
            'spong', 'ngocok', 'cewe', 'cowo', 'jablay', 'bispak', 'pelacur',
            'sundal', 'lonte', 'lacur', 'kunyuk', 'bajindul', 'brengsek',
            'kepret', 'kepruk', 'kampang', 'geblek', 'edan', 'stress',
            'gilak', 'sinting', 'waras', 'sarap', 'elek', 'jelek',
            'buruk', 'rusak', 'hancur', 'busuk', 'bego', 'dungu',
            'pandir', 'lemot', 'pekok', 'dodol', 'tolo', 'bloon',
            'koplak', 'norak', 'kampungan', 'ndeso', 'biadab', 'primitif',
            
            // Indonesian bad words - Tier 2 (Regional variations)
            'jangkrik', 'jangkriek', 'jangar', 'jangkung', 'jembut', 'jembrot',
            'jabrig', 'jabrik', 'jancok', 'jancuk', 'jangkrik', 'jalang',
            'jomblang', 'jomlo', 'jomblo', 'jomblowati', 'jancok',
            'bangsat', 'bangsad', 'brengsek', 'brengseng', 'brewok',
            'kacung', 'kacink', 'kacong', 'kadrun', 'kafir', 'kampret',
            'kampungan', 'kangkung', 'kearifan', 'keblinger', 'kebo',
            'kecoa', 'kencing', 'kentut', 'keparat', 'kepruk', 'keroco',
            'kimcil', 'kimochi', 'kontol', 'koplak', 'kudanil',
            'kunyuk', 'kurap', 'kursi', 'kutang', 'kutu', 'lonte',
            
            // Indonesian slang and vulgar terms
            'ngehe', 'songong', 'sombong', 'nyebelin', 'nyeremin', 'menyebalkan',
            'kesel', 'bete', 'males', 'badmood', 'sewot', 'gondok',
            'geram', 'emosi', 'naik pitam', 'murka', 'berang', 'gusar',
            'dongkol', 'jengkel', 'kecut', 'sebel', 'ilfeel', 'baper',
            'bucin', 'jones', 'gabut', 'kepo', 'sotoy', 'lebay',
            'norak', 'alay', 'kudet', 'garing', 'kaku', 'aneh',
            
            // English bad words - Tier 1
            'fuck', 'shit', 'bitch', 'damn', 'ass', 'asshole', 'bastard',
            'whore', 'slut', 'cunt', 'cock', 'dick', 'pussy', 'tits',
            'boobs', 'nigger', 'faggot', 'retard', 'motherfucker', 'fucker',
            'fucking', 'bullshit', 'horseshit', 'dipshit', 'shithead',
            'dickhead', 'douchebag', 'dumbass', 'jackass', 'smartass',
            'badass', 'hardass', 'fatass', 'bigass', 'dumbfuck',
            'clusterfuck', 'mindfuck', 'brainfuck', 'buttfuck', 'ratfuck',
            
            // English profanity variations
            'goddamn', 'goddam', 'dammit', 'damn it', 'hell no', 'what the hell',
            'go to hell', 'bloody hell', 'fucking hell', 'holy shit',
            'no shit', 'tough shit', 'eat shit', 'full of shit',
            'piece of shit', 'load of shit', 'pile of shit', 'shit happens',
            'shit face', 'shit for brains', 'shit storm', 'shitstorm',
            
            // Sexual terms - English
            'penis', 'vagina', 'masturbate', 'orgasm', 'horny', 'erotic',
            'pornography', 'masturbation', 'ejaculation', 'climax', 'intercourse',
            'fellatio', 'cunnilingus', 'anal', 'oral', 'threesome', 'foursome',
            'gangbang', 'bukkake', 'deepthroat', 'handjob', 'blowjob',
            'rimjob', 'titjob', 'footjob', 'creampie', 'cumshot', 'facial',
            
            // Sexual terms - Indonesian
            'bugil', 'telanjang', 'birahi', 'dewasa', 'porno', 'seksi',
            'hot', 'sexy', 'lesbian', 'homo', 'biseks', 'transgender',
            'crossdress', 'fetish', 'bdsm', 'bondage', 'sadist', 'masokis',
            'voyeur', 'exhibitionist', 'swinger', 'escort', 'gigolo',
            
            // Drugs and illegal substances
            'narkoba', 'ganja', 'marijuana', 'cocaine', 'heroin', 'ekstasi',
            'shabu', 'putaw', 'opium', 'morphine', 'amphetamine', 'barbiturate',
            'benzodiazepine', 'ketamine', 'pcp', 'lsd', 'mdma', 'meth',
            'crystal', 'crack', 'weed', 'pot', 'grass', 'dope',
            'hash', 'hashish', 'cannabis', 'joint', 'blunt', 'bong',
            'pipe', 'dealer', 'pusher', 'junkie', 'addict', 'overdose',
            
            // Violence and weapons
            'bunuh', 'pembunuhan', 'membunuh', 'tembak', 'menembak', 'tikam',
            'menikam', 'tusuk', 'menusuk', 'pukul', 'memukul', 'hajar',
            'menghajar', 'keroyok', 'mengeroyok', 'aniaya', 'menganiaya',
            'siksa', 'menyiksa', 'torture', 'tortur', 'sadis', 'brutal',
            'kejam', 'biadab', 'bengis', 'ganas', 'galak', 'garang',
            
            // Weapons
            'pistol', 'senapan', 'bedil', 'revolver', 'shotgun', 'rifle',
            'sniper', 'machine gun', 'ak47', 'ar15', 'uzi', 'glock',
            'beretta', 'colt', 'smith wesson', 'magnum', 'derringer',
            'carbine', 'assault rifle', 'submachine gun', 'grenade', 'bomb',
            'explosive', 'dinamit', 'tnt', 'c4', 'plastik explosive',
            'molotov', 'cocktail', 'knife', 'dagger', 'sword', 'machete',
            'katana', 'samurai', 'ninja', 'shuriken', 'nunchaku',
            
            // Racist terms
            'negro', 'chinky', 'chink', 'gook', 'jap', 'nip',
            'wetback', 'spic', 'beaner', 'gringo', 'honky', 'cracker',
            'redneck', 'hillbilly', 'trailer trash', 'white trash',
            'sand nigger', 'towelhead', 'raghead', 'terrorist', 'jihad',
            'infidel', 'kafir', 'kuffar', 'dhimmi', 'apostate',
            
            // Indonesian ethnic slurs
            'cina', 'chindo', 'pribumi', 'aseng', 'amoy', 'totok',
            'peranakan', 'keturunan', 'pendatang', 'asing', 'kafir',
            'murtad', 'sesat', 'bid\'ah', 'syirik', 'munafik',
            
            // Religious blasphemy
            'kafir', 'murtad', 'sesat', 'dajjal', 'iblis', 'setan',
            'laknat', 'terkutuk', 'celaka', 'azab', 'murka', 'dosa',
            'haram', 'maksiat', 'fasik', 'munafik', 'syirik', 'khurafat',
            
            // Political extremism
            'komunis', 'pki', 'nazi', 'fascist', 'fasis', 'diktator',
            'tiran', 'despotik', 'otoriter', 'militeris', 'junta',
            'kudeta', 'revolusi', 'pemberontakan', 'separatis', 'teroris',
            
            // Scam and fraud terms
            'penipuan', 'penipu', 'menipu', 'scam', 'scammer', 'fraud',
            'fraudster', 'con artist', 'con man', 'swindler', 'cheater',
            'liar', 'pembohong', 'bohong', 'dusta', 'palsu', 'tiruan',
            'bajakan', 'ilegal', 'gelap', 'underground', 'black market',
            
            // Gambling
            'judi', 'berjudi', 'taruhan', 'bertaruh', 'gambling', 'casino',
            'poker', 'blackjack', 'roulette', 'slot machine', 'jackpot',
            'bandar', 'bookie', 'odds', 'bet', 'betting', 'wager',
            'lottery', 'togel', 'toto', 'numbers', 'scratch card',
            
            // Additional Indonesian vulgar terms
            'bacot', 'bacod', 'mulut bau', 'bau mulut', 'kentut', 'berak',
            'boker', 'ee', 'tai', 'tinja', 'feses', 'kotoran', 'sampah',
            'garbage', 'trash', 'rubbish', 'waste', 'refuse', 'debris',
            'scrap', 'junk', 'crap', 'crud', 'filth', 'dirt', 'grime',
            'muck', 'slime', 'sludge', 'sewage', 'manure', 'dung',
            
            // Body parts (vulgar context)
            'pantat', 'bokong', 'dubur', 'anus', 'rectum', 'butthole',
            'asshole', 'butt crack', 'cleavage', 'nipple', 'areola',
            'pubic', 'groin', 'crotch', 'genitals', 'privates', 'balls',
            'testicles', 'scrotum', 'ballsack', 'nutsack', 'nuts',
            
            // Additional modern slang
            'cringe', 'simp', 'incel', 'chad', 'karen', 'boomer',
            'zoomer', 'millennial', 'gen z', 'ok boomer', 'sus',
            'sussy', 'imposter', 'amogus', 'poggers', 'pepega',
            'kekw', 'lul', 'lulw', 'omegalul', 'monkas', 'pepehands'
        ];
        
        this.nsfwKeywords = [
            // Adult content
            'porn', 'porno', 'pornography', 'xxx', 'sex', 'sexual', 'erotic',
            'nude', 'naked', 'topless', 'bottomless', 'lingerie', 'underwear',
            'bikini', 'swimsuit', 'revealing', 'exposed', 'flash', 'flashing',
            'streaking', 'mooning', 'upskirt', 'downblouse', 'voyeur',
            
            // Indonesian NSFW
            'bokep', 'bugil', 'telanjang', 'seksi', 'birahi', 'nafsu',
            'syahwat', 'libido', 'gairah', 'hasrat', 'keinginan', 'fantasi',
            'mimpi basah', 'wet dream', 'morning wood', 'hard on', 'boner',
            
            // Sexual acts
            'masturbate', 'masturbation', 'orgasm', 'climax', 'cum', 'ejaculation',
            'penetration', 'intercourse', 'coitus', 'copulation', 'mating',
            'breeding', 'fertilization', 'conception', 'impregnation',
            'insemination', 'ovulation', 'menstruation', 'period', 'bleeding',
            
            // Body parts in sexual context
            'boobs', 'tits', 'breasts', 'nipples', 'cleavage', 'chest',
            'pussy', 'vagina', 'vulva', 'labia', 'clitoris', 'g-spot',
            'cock', 'dick', 'penis', 'shaft', 'head', 'glans', 'foreskin',
            'balls', 'testicles', 'scrotum', 'prostate', 'anus', 'asshole',
            
            // Sexual positions and acts
            'missionary', 'doggy style', 'cowgirl', 'reverse cowgirl', 'spooning',
            'sixty nine', '69', 'standing', 'sitting', 'kneeling', 'bending',
            'anal', 'oral', 'vaginal', 'threesome', 'foursome', 'orgy',
            'gangbang', 'bukake', 'bukkake', 'creampie', 'facial', 'cumshot',
            
            // Sexual services and industry
            'prostitute', 'prostitution', 'escort', 'call girl', 'hooker',
            'whore', 'slut', 'brothel', 'massage parlor', 'strip club',
            'stripper', 'pole dancing', 'lap dance', 'peep show', 'adult film',
            'adult video', 'adult entertainment', 'red light district',
            
            // Fetishes and kinks
            'fetish', 'kink', 'bdsm', 'bondage', 'domination', 'submission',
            'sadism', 'masochism', 'sadist', 'masochist', 'dom', 'sub',
            'master', 'slave', 'mistress', 'daddy', 'mommy', 'roleplay',
            'cosplay', 'uniform', 'schoolgirl', 'nurse', 'maid', 'secretary',
            
            // Sex toys and accessories
            'dildo', 'vibrator', 'sex toy', 'adult toy', 'butt plug',
            'anal beads', 'cock ring', 'strap on', 'harness', 'whip',
            'paddle', 'handcuffs', 'blindfold', 'gag', 'rope', 'chain',
            'collar', 'leash', 'clamp', 'nipple clamp', 'ball gag',
            
            // Dating and hookup terms
            'hookup', 'one night stand', 'booty call', 'friends with benefits',
            'fwb', 'fuck buddy', 'casual sex', 'no strings attached', 'nsa',
            'swinger', 'swinging', 'open relationship', 'polyamory', 'threesome',
            
            // Online adult content
            'webcam', 'cam girl', 'cam boy', 'live show', 'private show',
            'tip menu', 'tokens', 'credits', 'premium', 'vip', 'exclusive',
            'custom video', 'sexting', 'nudes', 'dick pic', 'pussy pic',
            'tit pic', 'ass pic', 'selfie', 'mirror pic', 'bathroom pic'
        ];

        this.warningCount = new Map();
        this.maxWarnings = 3;
        
        // Whitelist untuk kata-kata yang mirip tapi tidak terlarang
        this.whitelist = [
            'hello', 'hell no', 'shell', 'bell', 'cell', 'well', 'tell', 'sell',
            'fell', 'dwell', 'swell', 'spell', 'smell', 'hello world',
            'indonesia', 'indones', 'analysis', 'analyst', 'analogy', 'analog',
            'canal', 'signal', 'final', 'personal', 'professional', 'national',
            'international', 'traditional', 'classical', 'musical', 'physical',
            'chemical', 'medical', 'technical', 'practical', 'magical',
            'logical', 'biological', 'psychological', 'sociological'
        ];
    }

    // Smart detection - check if text contains bad words with context awareness
    containsBadWords(text) {
        if (!text || typeof text !== 'string') return false;
        
        const normalizedText = text.toLowerCase().trim();
        
        // Check whitelist first - if it's a whitelisted word, it's safe
        for (const whiteWord of this.whitelist) {
            if (normalizedText === whiteWord.toLowerCase() || 
                normalizedText.includes(whiteWord.toLowerCase())) {
                return false;
            }
        }
        
        // Remove punctuation but keep word boundaries
        const cleanText = normalizedText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
        const words = cleanText.split(' ').filter(word => word.length > 0);
        
        return this.badWords.some(badWord => {
            // Exact word match (most accurate)
            if (words.includes(badWord)) return true;
            
            // For longer bad words (4+ chars), check if it appears as substring
            if (badWord.length >= 4) {
                return cleanText.includes(badWord);
            }
            
            // For short words (3 chars or less), only exact word match
            if (badWord.length <= 3) {
                const regex = new RegExp(`\\b${this.escapeRegex(badWord)}\\b`, 'i');
                return regex.test(cleanText);
            }
            
            return false;
        });
    }

    // Smart NSFW detection with context awareness
    containsNSFW(text) {
        if (!text || typeof text !== 'string') return false;
        
        const normalizedText = text.toLowerCase().trim();
        
        // Check whitelist first
        for (const whiteWord of this.whitelist) {
            if (normalizedText === whiteWord.toLowerCase() || 
                normalizedText.includes(whiteWord.toLowerCase())) {
                return false;
            }
        }
        
        const cleanText = normalizedText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
        const words = cleanText.split(' ').filter(word => word.length > 0);
        
        return this.nsfwKeywords.some(keyword => {
            // Exact word match
            if (words.includes(keyword)) return true;
            
            // For longer keywords, check substring
            if (keyword.length >= 4) {
                return cleanText.includes(keyword);
            }
            
            // For short keywords, exact word match only
            const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
            return regex.test(cleanText);
        });
    }

    // Escape special regex characters
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Get filtered bad words from text with smart detection
    getDetectedBadWords(text) {
        if (!text || typeof text !== 'string') return [];
        
        const normalizedText = text.toLowerCase().trim();
        
        // Check whitelist first
        for (const whiteWord of this.whitelist) {
            if (normalizedText === whiteWord.toLowerCase() || 
                normalizedText.includes(whiteWord.toLowerCase())) {
                return [];
            }
        }
        
        const cleanText = normalizedText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
        const words = cleanText.split(' ').filter(word => word.length > 0);
        const detected = [];
        
        this.badWords.forEach(badWord => {
            // Exact word match
            if (words.includes(badWord)) {
                detected.push(badWord);
                return;
            }
            
            // For longer bad words, check substring
            if (badWord.length >= 4 && cleanText.includes(badWord)) {
                detected.push(badWord);
                return;
            }
            
            // For short words, exact word match only
            if (badWord.length <= 3) {
                const regex = new RegExp(`\\b${this.escapeRegex(badWord)}\\b`, 'i');
                if (regex.test(cleanText)) {
                    detected.push(badWord);
                }
            }
        });
        
        return [...new Set(detected)]; // Remove duplicates
    }

    // Get detected NSFW keywords with smart detection
    getDetectedNSFW(text) {
        if (!text || typeof text !== 'string') return [];
        
        const normalizedText = text.toLowerCase().trim();
        
        // Check whitelist first
        for (const whiteWord of this.whitelist) {
            if (normalizedText === whiteWord.toLowerCase() || 
                normalizedText.includes(whiteWord.toLowerCase())) {
                return [];
            }
        }
        
        const cleanText = normalizedText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
        const words = cleanText.split(' ').filter(word => word.length > 0);
        const detected = [];
        
        this.nsfwKeywords.forEach(keyword => {
            // Exact word match
            if (words.includes(keyword)) {
                detected.push(keyword);
                return;
            }
            
            // For longer keywords, check substring
            if (keyword.length >= 4 && cleanText.includes(keyword)) {
                detected.push(keyword);
                return;
            }
            
            // For short keywords, exact word match only
            const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
            if (regex.test(cleanText)) {
                detected.push(keyword);
            }
        });
        
        return [...new Set(detected)]; // Remove duplicates
    }

    // Improved censor function with smart detection
    censorText(text) {
        if (!text || typeof text !== 'string') return text;
        
        let censoredText = text;
        const normalizedText = text.toLowerCase();
        
        // Check whitelist first
        for (const whiteWord of this.whitelist) {
            if (normalizedText === whiteWord.toLowerCase() || 
                normalizedText.includes(whiteWord.toLowerCase())) {
                return text; // Don't censor whitelisted content
            }
        }
        
        // Censor bad words
        this.badWords.forEach(badWord => {
            // Exact word replacement
            const exactRegex = new RegExp(`\\b${this.escapeRegex(badWord)}\\b`, 'gi');
            const censored = '*'.repeat(badWord.length);
            censoredText = censoredText.replace(exactRegex, censored);
            
            // For longer words, also replace partial matches
            if (badWord.length >= 4) {
                const partialRegex = new RegExp(this.escapeRegex(badWord), 'gi');
                censoredText = censoredText.replace(partialRegex, censored);
            }
        });
        
        return censoredText;
    }

    // Add word to whitelist
    addToWhitelist(word) {
        if (word && typeof word === 'string' && !this.whitelist.includes(word.toLowerCase())) {
            this.whitelist.push(word.toLowerCase());
            return true;
        }
        return false;
    }

    // Remove word from whitelist
    removeFromWhitelist(word) {
        const index = this.whitelist.indexOf(word.toLowerCase());
        if (index > -1) {
            this.whitelist.splice(index, 1);
            return true;
        }
        return false;
    }

    // Check if word is whitelisted
    isWhitelisted(text) {
        if (!text || typeof text !== 'string') return false;
        
        const normalizedText = text.toLowerCase().trim();
        return this.whitelist.some(whiteWord => 
            normalizedText === whiteWord || normalizedText.includes(whiteWord)
        );
    }

    // Add warning to user
    addWarning(userJid, reason) {
        const currentWarnings = this.warningCount.get(userJid) || 0;
        const newWarnings = currentWarnings + 1;
        this.warningCount.set(userJid, newWarnings);
        
        return {
            warnings: newWarnings,
            maxWarnings: this.maxWarnings,
            shouldTakeAction: newWarnings >= this.maxWarnings,
            reason: reason
        };
    }

    // Get user warning count
    getUserWarnings(userJid) {
        return this.warningCount.get(userJid) || 0;
    }

    // Reset user warnings
    resetWarnings(userJid) {
        this.warningCount.delete(userJid);
    }

    // Reset all warnings
    resetAllWarnings() {
        this.warningCount.clear();
    }

    // Improved content checking with smart algorithm
    checkContent(text) {
        const result = {
            isClean: true,
            hasBadWords: false,
            hasNSFW: false,
            detectedBadWords: [],
            detectedNSFW: [],
            censoredText: text,
            severity: 'clean', // clean, mild, moderate, severe
            isWhitelisted: false
        };

        if (!text || typeof text !== 'string') {
            return result;
        }

        // Check whitelist first
        if (this.isWhitelisted(text)) {
            result.isWhitelisted = true;
            return result; // Return clean if whitelisted
        }

        // Check for bad words with smart detection
        const badWords = this.getDetectedBadWords(text);
        if (badWords.length > 0) {
            result.isClean = false;
            result.hasBadWords = true;
            result.detectedBadWords = badWords;
            
            // Determine severity based on number and type of bad words
            if (badWords.length >= 5) {
                result.severity = 'severe';
            } else if (badWords.length >= 2) {
                result.severity = 'moderate';
            } else {
                result.severity = 'mild';
            }
            
            // Check for extremely offensive words
            const extremeWords = ['nigger', 'faggot', 'kontol', 'memek', 'ngentot'];
            if (badWords.some(word => extremeWords.includes(word))) {
                result.severity = 'severe';
            }
        }

        // Check for NSFW content with smart detection
        const nsfwWords = this.getDetectedNSFW(text);
        if (nsfwWords.length > 0) {
            result.isClean = false;
            result.hasNSFW = true;
            result.detectedNSFW = nsfwWords;
            result.severity = 'severe'; // NSFW content is always severe
        }

        // Generate censored version only if content is inappropriate
        if (!result.isClean) {
            result.censoredText = this.censorText(text);
        }

        return result;
    }

    // Add custom bad word
    addBadWord(word) {
        if (word && typeof word === 'string' && !this.badWords.includes(word.toLowerCase())) {
            this.badWords.push(word.toLowerCase());
            return true;
        }
        return false;
    }

    // Remove bad word
    removeBadWord(word) {
        const index = this.badWords.indexOf(word.toLowerCase());
        if (index > -1) {
            this.badWords.splice(index, 1);
            return true;
        }
        return false;
    }

    // Add custom NSFW keyword
    addNSFWKeyword(keyword) {
        if (keyword && typeof keyword === 'string' && !this.nsfwKeywords.includes(keyword.toLowerCase())) {
            this.nsfwKeywords.push(keyword.toLowerCase());
            return true;
        }
        return false;
    }

    // Remove NSFW keyword
    removeNSFWKeyword(keyword) {
        const index = this.nsfwKeywords.indexOf(keyword.toLowerCase());
        if (index > -1) {
            this.nsfwKeywords.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get comprehensive statistics
    getStats() {
        return {
            totalBadWords: this.badWords.length,
            totalNSFWKeywords: this.nsfwKeywords.length,
            totalWhitelistedWords: this.whitelist.length,
            usersWithWarnings: this.warningCount.size,
            maxWarnings: this.maxWarnings,
            badWordCategories: {
                indonesian: this.badWords.filter(word => 
                    ['anjing', 'bangsat', 'kontol', 'memek', 'ngentot', 'jancok', 'bajingan'].includes(word)
                ).length,
                english: this.badWords.filter(word => 
                    ['fuck', 'shit', 'bitch', 'damn', 'ass', 'asshole'].includes(word)
                ).length,
                racial: this.badWords.filter(word => 
                    ['nigger', 'chink', 'gook', 'spic', 'wetback'].includes(word)
                ).length,
                sexual: this.badWords.filter(word => 
                    ['penis', 'vagina', 'cock', 'dick', 'pussy', 'tits'].includes(word)
                ).length
            },
            filterEffectiveness: {
                totalWords: this.badWords.length + this.nsfwKeywords.length,
                whitelistProtection: this.whitelist.length,
                smartDetection: true,
                contextAware: true
            }
        };
    }

    // Test filter with sample texts
    testFilter() {
        const testCases = [
            'hello world',
            'hello there',
            'shell script',
            'analysis report',
            'indonesia is beautiful',
            'damn you',
            'fucking hell',
            'anjing gila',
            'kontol gede',
            'this is a normal sentence'
        ];

        console.log('🧪 Content Filter Test Results:');
        testCases.forEach(testCase => {
            const result = this.checkContent(testCase);
            console.log(`"${testCase}" -> Clean: ${result.isClean}, Severity: ${result.severity}, Whitelisted: ${result.isWhitelisted}`);
        });
    }

    // Get filter version and info
    getFilterInfo() {
        return {
            version: '2.0.0',
            name: 'Smart Content Filter',
            features: [
                'Context-aware detection',
                'Whitelist protection',
                'Smart word boundary detection',
                'Severity classification',
                'Multi-language support',
                'False positive reduction'
            ],
            languages: ['Indonesian', 'English'],
            totalPatterns: this.badWords.length + this.nsfwKeywords.length,
            lastUpdated: new Date().toISOString()
        };
    }
}

module.exports = ContentFilter;
