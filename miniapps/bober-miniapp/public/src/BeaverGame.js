class BeaverGame extends Phaser.Scene {
    constructor() {
        super('BeaverGame');
    }
    create() {
        // draw pixel-art river + grass background for this scene
        this.createBackground();

        // initialize sound/music system (preloader now loads these assets)
        try {
            EPT.Sfx && EPT.Sfx.manage && EPT.Sfx.manage('sound', 'init', this);
            EPT.Sfx && EPT.Sfx.manage && EPT.Sfx.manage('music', 'init', this);
        }
        catch(e) {
            console.warn('EPT.Sfx init failed:', e);
        }

        this.score = 0;
        // make game slightly more challenging: shorter base spawn interval
        this.spawnInterval = 900; // ms between logs (was 1200)
        this.logSpeed = 264; // pixels per second baseline (220 * 1.2 = 264)
        this.baseLogSpeed = this.logSpeed; // remember baseline for spacing calculations
        this.isRunning = true;
        // create simple pixel-style textures for beaver (idle + swim frames) and log
        this.createTextures();

        // compute lanes inside the river bounds so beaver stays within blue area
        var left = this.riverLeft || Math.floor(EPT.world.width * 0.2);
        var right = this.riverRight || Math.floor(EPT.world.width * 0.8);
        var riverW = right - left;
        this.lanes = [ Math.floor(left + riverW * 0.25), Math.floor(left + riverW * 0.75) ];

        // beaver initial side: left
        this.beaverSide = 0; // 0 = left, 1 = right
        this.beaver = this.add.sprite(this.lanes[this.beaverSide], EPT.world.height - 150, 'beaver_idle');
        this.beaver.setOrigin(0.5,0.5);

        // animations: swim (uses two frames)
        if(!this.anims.exists('beaver_swim')) {
            this.anims.create({
                key: 'beaver_swim',
                frames: [ { key: 'beaver_swim1' }, { key: 'beaver_swim2' } ],
                frameRate: 12,
                repeat: 0
            });
        }

        // idle bobbing tween
        this.beaverIdleTween = this.tweens.add({ targets: this.beaver, y: this.beaver.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        // when swim animation completes, restart idle bob
        this.beaver.on('animationcomplete', (anim, frame) => {
            if(anim.key === 'beaver_swim') {
                // ensure idle tween is running
                if(!this.beaverIdleTween || !this.beaverIdleTween.isPlaying()) {
                    this.beaverIdleTween && this.beaverIdleTween.restart();
                }
                this.beaver.setTexture('beaver_idle');
            }
        }, this);

        // group for logs
        this.logs = this.add.group();

        // particles (small leaves/bubbles) drifting down the river
        // ensure particle texture was preloaded in Preloader
        if(this.textures.exists('particle')) {
            // Create particle emitters using Phaser 3.60+ API
            this.particles = this.add.particles(this.riverLeft + 8, -25, 'particle', {
                x: { min: 0, max: this.riverRight - this.riverLeft - 16 },
                y: { min: -15, max: 15 },
                lifespan: { min: 4000, max: 9000 },
                speedY: { min: 30, max: 90 },
                speedX: { min: -30, max: 30 },
                scale: { start: 0.35, end: 0.6 },
                alpha: { start: 0.95, end: 0 },
                angle: { min: -30, max: 30 },
                rotate: { min: -180, max: 180 },
                frequency: 300,
                blendMode: 'NORMAL'
            });
            this.particles.setDepth(6);

            // debris layers (spawn at top like logs, flow downward, stay in river)
            this.debrisSlow = this.add.particles(this.riverLeft + 12, -30, 'particle', {
                x: { min: 0, max: this.riverRight - this.riverLeft - 24 },
                y: 0,
                lifespan: { min: 8000, max: 12000 },
                speedY: { min: 50, max: 90 },
                speedX: { min: -20, max: 20 },
                scale: { start: 0.7, end: 0.9 },
                alpha: { start: 0.8, end: 0.3 },
                rotate: { min: -40, max: 40 },
                frequency: 600,
                blendMode: 'NORMAL'
            });
            this.debrisSlow.setDepth(7);

            this.debrisFast = this.add.particles(this.riverLeft + 12, -30, 'particle', {
                x: { min: 0, max: this.riverRight - this.riverLeft - 24 },
                y: 0,
                lifespan: { min: 5000, max: 8000 },
                speedY: { min: 120, max: 200 },
                speedX: { min: -30, max: 30 },
                scale: { start: 0.5, end: 0.8 },
                alpha: { start: 0.9, end: 0.4 },
                rotate: { min: -180, max: 180 },
                frequency: 400,
                blendMode: 'NORMAL'
            });
            this.debrisFast.setDepth(8);

            // dedicated splash emitter for lane changes (no auto-emit)
            this.splashEmitter = this.add.particles(0, 0, 'particle', {
                speed: { min: 100, max: 250 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.5, end: 0.1 },
                alpha: { start: 1, end: 0 },
                lifespan: { min: 400, max: 700 },
                blendMode: 'ADD',
                tint: 0x87CEEB,
                frequency: -1
            });
            this.splashEmitter.setDepth(9);

            // trail emitters - two emitters on both sides of beaver body
            this.trailEmitterLeft = this.add.particles(0, 0, 'particle', {
                speedY: { min: 60, max: 120 },
                speedX: { min: -40, max: 40 },
                scale: { start: 1.5, end: 0.3 },
                alpha: { start: 0.5, end: 0 },
                lifespan: { min: 800, max: 1400 },
                blendMode: 'ADD',
                tint: 0x4169E1,
                frequency: 25,
                quantity: 1
            });
            this.trailEmitterLeft.setDepth(5);
            this.trailEmitterLeft.startFollow(this.beaver, -this.beaver.displayWidth * 0.35, this.beaver.displayHeight * 0.35);
            
            this.trailEmitterRight = this.add.particles(0, 0, 'particle', {
                speedY: { min: 60, max: 120 },
                speedX: { min: -40, max: 40 },
                scale: { start: 1.5, end: 0.3 },
                alpha: { start: 0.5, end: 0 },
                lifespan: { min: 800, max: 1400 },
                blendMode: 'ADD',
                tint: 0x4169E1,
                frequency: 25,
                quantity: 1
            });
            this.trailEmitterRight.setDepth(5);
            this.trailEmitterRight.startFollow(this.beaver, this.beaver.displayWidth * 0.35, this.beaver.displayHeight * 0.35);
        }

        // UI
        var fontScore = { font: '38px '+EPT.text['FONT'], fill: '#ffde00', stroke: '#000', strokeThickness: 6 };
        // score text (pixel-art style with background panel)
        this.textScore = this.add.text(EPT.world.width-30, 18, EPT.text['gameplay-score']+this.score, fontScore);
        this.textScore.setOrigin(1,0);
        // background panel behind score
        var padX = 12, padY = 8;
        var rectX = this.textScore.x - this.textScore.width - padX;
        var rectY = this.textScore.y - padY;
        var rectW = this.textScore.width + padX*2;
        var rectH = this.textScore.height + padY*2;
        this.scoreBg = this.add.rectangle(rectX, rectY, rectW, rectH, 0x000000).setOrigin(0,0);
        this.scoreBg.setStrokeStyle(6, 0xffde00);
        // push UI above shimmer overlay
        this.scoreBg.setDepth(50);
        this.textScore.setDepth(51);

        // speed lines for near-miss effect
        this.speedLines = this.add.group();
        for(var i = 0; i < 8; i++) {
            var line = this.add.rectangle(0, 0, Phaser.Math.Between(100, 300), 3, 0xffffff, 0);
            line.setOrigin(0, 0.5);
            line.setDepth(45);
            this.speedLines.add(line);
        }

        // controls
        this.input.keyboard.on('keydown-SPACE', this.switchSide, this);
        this.input.on('pointerdown', this.switchSide, this);

        // spawn timing helpers: track last spawn times to enforce safe gaps per lane
        this.lastSpawnTimeByLane = [0,0];
        this.lastGlobalSpawn = 0;
        // minimum gap (ms) between logs in the same lane; keep it tight but fair
        this.minLaneGap = 350;
        // minimum global gap to avoid instant consecutive spawns (ms)
        this.minGlobalGap = 140;
        // start easier: larger distances for the first few seconds, then revert
        this.isInitialEasy = true;
        this.initialEasyDuration = 5000; // ms of easier spacing
        this.initialGapMultiplier = 1.5; // multiply distance gaps during initial period
        this.initialEasyStart = (this.time && this.time.now) ? this.time.now : Date.now();
        this.time.delayedCall(this.initialEasyDuration, function(){ this.isInitialEasy = false; }, [], this);

        // track last spawned lanes to prevent more than 3 consecutive logs on same side
        this.laneHistory = [];

        // spawn first log immediately and set up the manual scheduler for spawn timing
        this.spawnLog();
        // scheduled delayed call for next spawn (will be created by scheduleNextSpawn)
        this.spawnTimer = null;
        // spawn ramp: from 1000ms down to 300ms over 15s
        this.spawnStartInterval = 2000; // start at 2000ms (2 seconds)
        this.spawnEndInterval = 300;
        this.spawnRampDuration = 20000; // 20 seconds
        this.spawnInterval = this.spawnStartInterval;
        this.spawnRampTick = 200; // tick every 200ms to update spawnInterval
        this.spawnRampTicks = Math.ceil(this.spawnRampDuration / this.spawnRampTick);
        this.spawnRampDelta = (this.spawnStartInterval - this.spawnEndInterval) / Math.max(1, this.spawnRampTicks);
        // helper to schedule next spawn using current this.spawnInterval
        this.scheduleNextSpawn = function() {
            if(this.spawnTimer) {
                try { this.spawnTimer.remove(false); } catch(e) {}
            }
            this.spawnTimer = this.time.delayedCall(this.spawnInterval, () => {
                this.spawnLog();
                // schedule the following one
                this.scheduleNextSpawn();
            }, [], this);
        };
        // start the ramp timer to decrease spawnInterval gradually
        this.spawnRampTimer = this.time.addEvent({ delay: this.spawnRampTick, callback: function(){
            if(this.spawnInterval > this.spawnEndInterval) {
                this.spawnInterval = Math.max(this.spawnEndInterval, this.spawnInterval - this.spawnRampDelta);
            } else {
                // reached target, stop ramp timer
                this.spawnRampTimer.remove(false);
            }
        }, callbackScope: this, loop: true });
        // schedule the first next spawn
        this.scheduleNextSpawn();

        // difficulty timer: smoothly ramp log speed over a 15-20s window
        this.maxLogSpeed = 1200;
        // target speed to reach during the initial ramp (keeps game in a playable window)
        this.logSpeedTarget = Math.min(960, this.maxLogSpeed); // 800 * 1.2 = 960
        // randomized ramp duration between 15s and 20s
        this.difficultyRampDuration = Phaser.Math.Between(15000, 20000);
        var rampTick = 250; // tick every 250ms for smooth increments
        this.difficultyTicks = Math.ceil(this.difficultyRampDuration / rampTick);
        this.difficultyTickIncrease = (this.logSpeedTarget - this.logSpeed) / Math.max(1, this.difficultyTicks);
        this.difficultyTimer = this.time.addEvent({ delay: rampTick, callback: this.increaseDifficulty, callbackScope: this, loop: true });

        // color flash overlay for collision/near-miss feedback
        this.flashOverlay = this.add.rectangle(0, 0, EPT.world.width, EPT.world.height, 0xff0000, 0);
        this.flashOverlay.setOrigin(0, 0);
        this.flashOverlay.setDepth(1000);

        this.cameras.main.fadeIn(250);
    }
    
    screenShake(intensity = 5, duration = 200) {
        this.cameras.main.shake(duration, intensity / 1000);
    }
    
    flashScreen(color = 0xff0000, maxAlpha = 0.5, duration = 200) {
        if(this.flashOverlay) {
            this.flashOverlay.setFillStyle(color, maxAlpha);
            this.tweens.add({ targets: this.flashOverlay, alpha: 0, duration: duration, ease: 'Cubic.easeOut' });
        }
    }
    
    showSpeedLines() {
        if(!this.speedLines) return;
        var lines = this.speedLines.getChildren();
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var y = Phaser.Math.Between(100, EPT.world.height - 100);
            var width = Phaser.Math.Between(150, 400);
            line.setPosition(-width, y);
            line.setSize(width, Phaser.Math.Between(2, 4));
            line.setAlpha(Phaser.Math.FloatBetween(0.6, 0.9));
            
            this.tweens.add({
                targets: line,
                x: EPT.world.width,
                duration: Phaser.Math.Between(200, 400),
                ease: 'Linear',
                onComplete: () => { line.setAlpha(0); }
            });
        }
    }

    createTextures() {
        // beaver textures (idle + two swim frames), vertical top-down pixel style
        var g = this.make.graphics({x:0,y:0,add:false});
        // make beaver 1.5x larger than previous base for more pixel detail
        var bw = 60, bh = 84;
        // base shape for head/body/tail for reuse (using relative sizes)
        function drawBeaverBase(offsetHead, offsetTail) {
            g.clear();
            // make the head squarer (narrower sides) and flush with the body
            var headH = Math.max(18, Math.floor(bh * 0.28));
            var tailW = Math.max(12, Math.floor(bw * 0.28));
            var bodyY = headH; // flush: body starts immediately after head
            var bodyH = Math.max(24, bh - headH - 16);
            // head (squarer) - centered, offsetHead nudges left/right
            g.fillStyle(0x6B4226, 1);
            var headW = Math.max(18, Math.floor(bw * 0.5));
            var headX = Math.floor((bw - headW) / 2) + (offsetHead||0);
            // small side ears (pixel-style)
            g.fillStyle(0x51301A, 1);
            g.fillRect(headX - 2, 2, 4, 4);
            g.fillRect(headX + headW - 2, 2, 4, 4);
            // inner ear highlight
            g.fillStyle(0xC68642, 1);
            g.fillRect(headX - 1, 3, 2, 2);
            g.fillRect(headX + headW - 1, 3, 2, 2);
            // head rectangle
            g.fillStyle(0x6B4226, 1);
            g.fillRect(headX, 0, headW, headH);
            // small neck shading to blend head and body
            g.fillStyle(0x5A331F, 1);
            g.fillRect(headX + 2, headH - 2, headW - 4, 2);
            // main body
            g.fillStyle(0x8B5A2B, 1);
            g.fillRect(6, bodyY, bw-12, bodyH);
            // lighter belly stripe across middle
            g.fillStyle(0xC68642, 1);
            g.fillRect(10, Math.floor(bh/2)-12, bw-20, 24);
            // tail at bottom (centered)
            g.fillStyle(0x51301A, 1);
            g.fillRect(Math.floor(bw/2)-Math.floor(tailW/2) + (offsetTail||0), bh-14, tailW, 14);
            // small darker fur pixels for texture (randomized)
            g.fillStyle(0x5A331F, 1);
            for(var fx=8; fx < bw-8; fx += 8) {
                for(var fy = bodyY+6; fy < bodyY+bodyH-6; fy += 10) {
                    if(Phaser.Math.Between(0,3) === 0) {
                        g.fillRect(fx + (Phaser.Math.Between(-1,1)), fy + (Phaser.Math.Between(-1,1)), 2, 2);
                    }
                }
            }
        }

        // idle frame
        drawBeaverBase(0,0);
        // add a small nose/highlight on head
        g.fillStyle(0xD2A679, 1);
        g.fillRect(Math.floor(bw/2)-4, Math.floor(bh*0.06), 4, 3);
        g.generateTexture('beaver_idle', bw, bh);

        // swim frame 1 (tail slightly left, paddles out)
        drawBeaverBase(0,-3);
        g.fillStyle(0x5A331F, 1);
        g.fillRect(10, Math.floor(bh*0.28), 6, 4);
        g.fillRect(bw-18, Math.floor(bh*0.28), 6, 4);
        g.generateTexture('beaver_swim1', bw, bh);

        // swim frame 2 (tail slightly right, paddles opposite)
        drawBeaverBase(0,3);
        g.fillStyle(0x5A331F, 1);
        g.fillRect(10, Math.floor(bh*0.32), 6, 4);
        g.fillRect(bw-18, Math.floor(bh*0.32), 6, 4);
        g.generateTexture('beaver_swim2', bw, bh);
        g.clear();

        // log texture (pixel-art top-down log, no circular rings)
        var lw = 120, lh = 28;
        g.fillStyle(0x6B4226, 1);
        g.fillRect(0, 0, lw, lh);
        // inner lighter plank texture
        g.fillStyle(0x8B5A2B, 1);
        g.fillRect(6, 4, lw-12, lh-8);
        // wood grain - draw small thin stripes along length
        g.fillStyle(0x5A331F, 1);
        for(var sx = 12; sx < lw-12; sx += 14) {
            var sy = 6 + (sx % 10);
            g.fillRect(sx, sy, 2, lh-12);
        }
        // dark edge pixels
        g.fillStyle(0x3E2414, 1);
        g.fillRect(0, 0, 2, lh);
        g.fillRect(lw-2, 0, 2, lh);
        g.generateTexture('log', lw, lh);
        g.destroy();
    }

    createBackground() {
        var W = EPT.world.width;
        var H = EPT.world.height;
        var tile = 8; // pixel block size
        var riverWidth = Math.floor(W * 0.6);
        var sideWidth = Math.floor((W - riverWidth) / 2);
        var leftBound = sideWidth;
        var rightBound = leftBound + riverWidth;

        // expose river bounds for other methods
        this.riverLeft = leftBound;
        this.riverRight = rightBound;
        this.riverWidth = riverWidth;

        var g = this.make.graphics({x:0,y:0,add:false});

        for(var y=0; y<H; y+=tile) {
            for(var x=0; x<W; x+=tile) {
                if(x < leftBound || x >= rightBound) {
                    // grass - pick a green shade with slight variation
                    var greens = [0x2E8B57, 0x228B22, 0x32CD32, 0x3CB371];
                    var color = greens[Phaser.Math.Between(0, greens.length-1)];
                    g.fillStyle(color, 1);
                }
                else {
                    // river - blue shades
                    var blues = [0x1E90FF, 0x00BFFF, 0x4682B4, 0x6495ED];
                    var color = blues[Phaser.Math.Between(0, blues.length-1)];
                    g.fillStyle(color, 1);
                }
                g.fillRect(x, y, tile, tile);
            }
        }

        g.generateTexture('beaver-bg', W, H);
        g.destroy();

        // make full canvas background a TileSprite so grass can move independently
        this.bg = this.add.tileSprite(0, 0, W, H, 'beaver-bg').setOrigin(0,0).setDepth(-11);
        // offsets and speed factors for grass (now) and water (will be twice as fast)
        this.grassOffset = 0;
        this.waterOffset = 0;
        this.waterFactorGrass = 0.18; // current water speed factor
        this.waterFactorWater = this.waterFactorGrass * 2; // water will move twice as fast

        // create a separate river-only texture so we can move water independently
        var rg = this.make.graphics({x:0,y:0,add:false});
        rg.clear();
        for(var y=0; y<H; y+=tile) {
            for(var x=0; x<riverWidth; x+=tile) {
                var blues = [0x1E90FF, 0x00BFFF, 0x4682B4, 0x6495ED];
                var color = blues[Phaser.Math.Between(0, blues.length-1)];
                rg.fillStyle(color, 1);
                rg.fillRect(x, y, tile, tile);
            }
        }
        rg.generateTexture('river-bg', riverWidth, H);
        rg.destroy();
        // tile sprite for moving water area (will move opposite to logs)
        this.river = this.add.tileSprite(leftBound, 0, riverWidth, H, 'river-bg').setOrigin(0,0).setDepth(-9);
        // accumulator for vertical water movement (pixels)
        this.waterOffset = 0;
        // create a visible shimmer overlay for the river (semi-transparent horizontal stripes)
        var sg = this.make.graphics({x:0,y:0,add:false});
        var sw = 64, sh = 10;
        sg.clear();
        // draw a brighter horizontal stripe pattern that will tile across the river
        for(var sx=0;sx<sw;sx+=5) {
            sg.fillStyle(0xFFFFFF, 0.12);
            sg.fillRect(sx, 0, 3, sh);
        }
        sg.generateTexture('river-shimmer', sw, sh);
        sg.destroy();
        // add a TileSprite on top of the river area to animate the shimmer independently
        this.riverShimmer = this.add.tileSprite(leftBound, 0, riverWidth, H, 'river-shimmer').setOrigin(0,0).setDepth(-9).setAlpha(0.35).setBlendMode('ADD');
        // add a fullscreen shimmer overlay (covers grass + river + objects) - subtle and additive
        this.globalShimmer = this.add.tileSprite(0, 0, W, H, 'river-shimmer').setOrigin(0,0).setDepth(5).setAlpha(0.18).setBlendMode('ADD');
    }

    spawnLog() {
        if(!this.isRunning) return;
        var now = (this.time && this.time.now) ? this.time.now : Date.now();
        
        // check if last 3 logs were all on the same lane - if so, force the other lane
        var forceLane = null;
        if(this.laneHistory.length >= 3) {
            var lastThree = this.laneHistory.slice(-3);
            if(lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
                forceLane = 1 - lastThree[0]; // force opposite lane
            }
        }
        
        // choose lane randomly, but validate distance-based gap vs the last active log in that lane
        var desiredLane = forceLane !== null ? forceLane : Phaser.Math.Between(0,1);
        var candidates = forceLane !== null ? [forceLane] : [desiredLane, 1-desiredLane];
        var chosen = null;
        var spawnY = -40;
        // helper to find the last (closest) active log in a given lane
        var findLastLogInLane = (ln) => {
            var children = this.logs.getChildren();
            var last = null;
            for(var i=0;i<children.length;i++) {
                var c = children[i];
                if(!c.active) continue;
                if(c.lane === ln) {
                    if(!last || c.y > last.y) last = c;
                }
            }
            return last;
        };

        for(var i=0;i<candidates.length;i++) {
            var c = candidates[i];
            var lastLog = findLastLogInLane(c);
            if(!lastLog) {
                chosen = c;
                break;
            }
            // determine required pixel gap based on log size (keep consistent)
            var lastH = (lastLog.displayHeight && lastLog.displayHeight > 0) ? lastLog.displayHeight : 28;
            var baseGap = Math.floor(lastH * 3);
            // compute gradual decay multiplier during initial easy period
            var gapMultiplier = 1;
            if(this.initialEasyStart && this.initialEasyDuration) {
                var elapsedEasy = Math.max(0, now - this.initialEasyStart);
                if(elapsedEasy < this.initialEasyDuration) {
                    var t = Phaser.Math.Clamp(elapsedEasy / this.initialEasyDuration, 0, 1);
                    gapMultiplier = 1 + ((this.initialGapMultiplier || 1.5) - 1) * (1 - t);
                }
            }
            // scale pixel gap inversely with current speed so gaps are larger at low speed and shrink as speed increases
            var speedFactor = (this.baseLogSpeed && this.logSpeed) ? (this.baseLogSpeed / Math.max(1, this.logSpeed)) : 1;
            var minPixelGap = Math.max(120, Math.ceil(baseGap * gapMultiplier * speedFactor)); // about 3x log height, conservative
            var pixelDist = lastLog.y - spawnY;
            if(pixelDist >= minPixelGap) {
                chosen = c;
                break;
            }
        }

        // if no candidate lane has enough physical gap, compute a delay so new log won't get too close
        if(chosen === null) {
            // find the soonest time when either lane will be clear enough
            var shortestDelay = null;
            for(var i=0;i<candidates.length;i++) {
                var c = candidates[i];
                var lastLog = findLastLogInLane(c);
                if(!lastLog) { shortestDelay = 0; chosen = c; break; }
                var lastH = (lastLog.displayHeight && lastLog.displayHeight > 0) ? lastLog.displayHeight : 28;
                var baseGap = Math.floor(lastH * 3);
                var gapMultiplier = 1;
                if(this.initialEasyStart && this.initialEasyDuration) {
                    var elapsedEasy = Math.max(0, now - this.initialEasyStart);
                    if(elapsedEasy < this.initialEasyDuration) {
                        var t = Phaser.Math.Clamp(elapsedEasy / this.initialEasyDuration, 0, 1);
                        gapMultiplier = 1 + ((this.initialGapMultiplier || 1.5) - 1) * (1 - t);
                    }
                }
                var speedFactor = (this.baseLogSpeed && this.logSpeed) ? (this.baseLogSpeed / Math.max(1, this.logSpeed)) : 1;
                var minPixelGap = Math.max(120, Math.ceil(baseGap * gapMultiplier * speedFactor));
                var pixelDist = lastLog.y - spawnY;
                var need = minPixelGap - pixelDist; // positive means we need to wait
                var delayMs = Math.ceil((need / Math.max(1, this.logSpeed)) * 1000);
                if(delayMs < 0) delayMs = 0;
                if(shortestDelay === null || delayMs < shortestDelay) shortestDelay = delayMs;
            }
            // also enforce a small global minimum gap
            shortestDelay = Math.max(shortestDelay || 0, this.minGlobalGap || 120);
            // schedule a retry after computed delay
            this.time.delayedCall(shortestDelay, this.spawnLog, [], this);
            return;
        }

        var x = this.lanes[chosen];
        var log = this.add.sprite(x, spawnY, 'log');
        log.setOrigin(0.5,0.5);
        log.lane = chosen;
        log.scored = false;
        this.logs.add(log);
        
        // record lane in history (keep last 10 for tracking)
        this.laneHistory.push(chosen);
        if(this.laneHistory.length > 10) {
            this.laneHistory.shift();
        }
        
        // record last spawn for bookkeeping
        this.lastSpawnTimeByLane[chosen] = now;
        this.lastGlobalSpawn = now;

        // compute duration based on speed and distance
        var distance = (EPT.world.height + 100);
        var duration = distance / (this.logSpeed / 1000);
        // compute target Y so the log remains visible until fully off-screen
        var halfH = (log.displayHeight && log.displayHeight > 0) ? (log.displayHeight/2) : 20;
        var targetY = EPT.world.height + halfH + 10;
        // use a tween to move log downwards and destroy when fully off-screen
        this.tweens.add({ targets: log, y: targetY, duration: duration, ease: 'Linear', onComplete: () => {
            if(log && log.active) {
                log.destroy();
            }
        }});

        // add wobble animation to the log - rotation + slight horizontal sway
        var rot = Phaser.Math.Between(-15, 15);
        this.tweens.add({ targets: log, angle: rot, duration: Phaser.Math.Between(300,600), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        
        // add subtle horizontal wobble for more dynamic movement
        var sway = Phaser.Math.Between(3, 8);
        this.tweens.add({ targets: log, x: x + sway, duration: Phaser.Math.Between(400,700), yoyo: true, repeat: -1, ease: 'Sine.inOut' });

        // (collision handled in update loop)
    }

    update(time, delta) {
        if(!this.isRunning) return;
        
        // animate river shimmer: small horizontal wobble + subtle vertical drift
        if(this.riverShimmer || this.bg || this.globalShimmer) {
            var t = time || ((this.time && this.time.now) ? this.time.now : 0);
            // vertical movement: grass moves at the previous water speed, water moves twice as fast
            var speed = this.logSpeed || 200;
            var dyGrass = (speed * (this.waterFactorGrass || 0.18)) * (delta / 1000);
            var dyWater = (speed * (this.waterFactorWater || (0.18*2))) * (delta / 1000);
            this.grassOffset = (this.grassOffset || 0) - dyGrass; // move opposite to logs
            this.waterOffset = (this.waterOffset || 0) - dyWater;
            if(this.bg) this.bg.tilePositionY = this.grassOffset;
            if(this.river) this.river.tilePositionY = this.waterOffset;
            if(this.riverShimmer) {
                this.riverShimmer.tilePositionX = Math.sin(t * 0.0035) * 10;
                this.riverShimmer.tilePositionY = Math.sin(t * 0.0017) * 2 + this.waterOffset * 0.6;
                this.riverShimmer.x = this.river.x;
                this.riverShimmer.y = this.river.y;
            }
            if(this.globalShimmer) {
                this.globalShimmer.tilePositionX = Math.sin(t * 0.0025) * 12;
                this.globalShimmer.tilePositionY = Math.sin(t * 0.0013) * 3 + this.waterOffset * 0.35;
            }
        }
        var beaverBounds = this.beaver.getBounds();
        var children = this.logs.getChildren();
        for(var i = children.length-1; i >= 0; i--) {
            var log = children[i];
            if(!log.active) continue;
            var logBounds = log.getBounds();
            
            // near-miss detection: if log is approaching very close (before it reaches beaver)
            if(!log.nearMissTriggered) {
                var verticalDist = Math.abs(log.y - this.beaver.y);
                var horizontalDist = Math.abs(log.x - this.beaver.x);
                if(verticalDist < 80 && horizontalDist < 100 && log.y < this.beaver.y - 20) {
                    log.nearMissTriggered = true;
                    // brief slow-mo
                    this.time.timeScale = 0.4;
                    this.time.delayedCall(400, () => { this.time.timeScale = 1; });
                    // camera zoom-in
                    this.cameras.main.zoomTo(1.1, 150, 'Quad.easeOut');
                    this.time.delayedCall(350, () => {
                        this.cameras.main.zoomTo(1.0, 200, 'Quad.easeInOut');
                    });
                    // speed lines
                    this.showSpeedLines();
                }
            }
            
            // bounding-box collision
            if(Phaser.Geom.Intersects.RectangleToRectangle(beaverBounds, logBounds)) {
                this.screenShake(8, 300);
                this.gameOver();
                return;
            }
            // if log passed beaver safely (y greater than beaver + margin) -> award small bonus and destroy
            var passMargin = (this.beaver.displayHeight ? this.beaver.displayHeight/2 : 20) + 10;
            if(log.y > this.beaver.y + passMargin) {
                if(!log.scored) {
                    var points = 10;
                    this.incrementScore(points);
                    log.scored = true;
                    // small popup +10
                    var popupFont = { font: '32px '+EPT.text['FONT'], fill: '#ffde00', stroke: '#000', strokeThickness: 6 };
                    var popup = this.add.text(log.x, log.y, '+'+points, popupFont).setOrigin(0.5);
                    popup.setDepth(100);
                    this.tweens.add({ targets: popup, y: popup.y - 40, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: function(){ popup.destroy(); } });
                }
            }
        }
    }

    switchSide() {
        if(!this.isRunning) return;
        // toggle side
        this.beaverSide = this.beaverSide ? 0 : 1;
        var startX = this.beaver.x;
        var targetX = this.lanes[this.beaverSide];
        var distance = Math.abs(targetX - startX);
        var duration = 120;
        
        // squash & stretch animation - anticipation before movement
        this.beaver.setScale(0.7, 1.3); // squash horizontally, stretch vertically
        this.tweens.add({ targets: this.beaver, x: targetX, duration: duration, ease: 'Back.easeOut' });
        this.tweens.add({ 
            targets: this.beaver, 
            scaleX: 1.3, 
            scaleY: 0.7, 
            duration: duration * 0.6, 
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({ targets: this.beaver, scaleX: 1, scaleY: 1, duration: duration * 0.8, ease: 'Elastic.easeOut', elasticity: 300 });
            }
        });
        EPT.Sfx.play('click');

        // make game a little harder but keep it fair
        this.logSpeed += 6; // smaller per-switch bump

        // emit particles along the movement path (middle of body, underneath)
        var sy = this.beaver.y + (this.beaver.displayHeight ? this.beaver.displayHeight * 0.3 : 10);
        var numSteps = Math.ceil(distance / 20); // emit every ~20 pixels
        var step = 0;
        
        // create a timer to spawn particles along the path as beaver moves
        var pathTimer = this.time.addEvent({
            delay: duration / numSteps,
            repeat: numSteps - 1,
            callback: function() {
                var t = step / (numSteps - 1 || 1);
                var currentX = startX + (targetX - startX) * t;
                
                // spawn smaller splashes along the path
                if(this.splashEmitter) {
                    try { this.splashEmitter.explode(5, currentX, sy); } catch(e) {}
                }
                if(this.particles) {
                    try { this.particles.explode(3, currentX, sy); } catch(e) {}
                }
                
                step++;
            },
            callbackScope: this
        });
        
        // final burst at destination
        this.time.delayedCall(duration, function() {
            if(this.splashEmitter) {
                try { this.splashEmitter.explode(20, targetX, sy); } catch(e) {}
            }
            if(this.debrisFast) {
                try { this.debrisFast.explode(8, targetX, sy); } catch(e) {}
            }
            if(this.debrisSlow) {
                try { this.debrisSlow.explode(5, targetX, sy); } catch(e) {}
            }
        }, [], this);
    }

    increaseDifficulty() {
        // smooth ramp towards the configured target during the initial window
        if(this.logSpeed < this.logSpeedTarget) {
            // apply the tick increase computed at create()
            this.logSpeed += Math.max(0.5, this.difficultyTickIncrease);
            if(this.logSpeed > this.logSpeedTarget) this.logSpeed = this.logSpeedTarget;
            return;
        }
        // after reaching the initial target, continue gentle increases up to the absolute max
        if(this.logSpeed < this.maxLogSpeed) {
            this.logSpeed += 6; // gentle ongoing ramp
        }
    }

    incrementScore(amount) {
        this.score += amount;
        this.textScore.setText(EPT.text['gameplay-score']+this.score);
        // update background panel size/position to fit new text
        if(this.scoreBg && this.textScore) {
            var padX = 12, padY = 8;
            var rectX = this.textScore.x - this.textScore.width - padX;
            var rectY = this.textScore.y - padY;
            var rectW = this.textScore.width + padX*2;
            var rectH = this.textScore.height + padY*2;
            this.scoreBg.setPosition(rectX, rectY);
            this.scoreBg.setSize(rectW, rectH);
        }
    }

    gameOver() {
        this.isRunning = false;
        // stop spawning
        if(this.spawnTimer) {
            try { this.spawnTimer.remove(false); } catch(e) {}
        }
        if(this.spawnRampTimer) {
            try { this.spawnRampTimer.remove(false); } catch(e) {}
        }
        // stop all active tweens (logs movement)
        this.tweens.killAll();
        
        var previousHighscore = EPT.Storage.getFloat('EPT-highscore') || 0;
        EPT.Storage.setHighscore('EPT-highscore', this.score);
        
        // MiniApp integration: mint NFT badge on new high score
        if(window.miniapp && window.miniapp.mintBadge && this.score > previousHighscore) {
            try {
                window.miniapp.mintBadge(this.score);
            } catch(e) {
                console.warn('Failed to mint badge:', e);
            }
        }

        // use same font style as gameplay score for consistency
        var fontScore = { font: '38px '+EPT.text['FONT'], fill: '#ffde00', stroke: '#000', strokeThickness: 6 };
        var fontTitle = { font: '48px '+EPT.text['FONT'], fill: '#ffde00', stroke: '#000', strokeThickness: 10 };

        this.screenGameoverGroup = this.add.group();
        
        // create grass/water background matching the game screen
        var W = EPT.world.width;
        var H = EPT.world.height;
        var g = this.make.graphics({x:0,y:0,add:false});
        var tile = 8;
        var riverWidth = Math.floor(W * 0.6);
        var sideWidth = Math.floor((W - riverWidth) / 2);
        var leftBound = sideWidth;
        var rightBound = leftBound + riverWidth;

        for(var y=0; y<H; y+=tile) {
            for(var x=0; x<W; x+=tile) {
                if(x < leftBound || x >= rightBound) {
                    // grass
                    var greens = [0x2E8B57, 0x228B22, 0x32CD32, 0x3CB371];
                    var color = greens[Phaser.Math.Between(0, greens.length-1)];
                    g.fillStyle(color, 1);
                } else {
                    // river
                    var blues = [0x1E90FF, 0x00BFFF, 0x4682B4, 0x6495ED];
                    var color = blues[Phaser.Math.Between(0, blues.length-1)];
                    g.fillStyle(color, 1);
                }
                g.fillRect(x, y, tile, tile);
            }
        }
        g.generateTexture('gameover-bg', W, H);
        g.destroy();
        
        this.screenGameoverBg = this.add.image(0, 0, 'gameover-bg');
        this.screenGameoverBg.setOrigin(0, 0);
        
        this.screenGameoverText = this.add.text(EPT.world.centerX, 100, EPT.text['gameplay-gameover'], fontTitle);
        this.screenGameoverText.setOrigin(0.5,0);
        
        // score display with background panel matching gameplay UI
        this.screenGameoverScore = this.add.text(EPT.world.centerX, 250, EPT.text['gameplay-score']+this.score, fontScore);
        this.screenGameoverScore.setOrigin(0.5,0.5);
        
        // background panel for score
        var padX = 12, padY = 8;
        var rectX = this.screenGameoverScore.x - this.screenGameoverScore.width/2 - padX;
        var rectY = this.screenGameoverScore.y - this.screenGameoverScore.height/2 - padY;
        var rectW = this.screenGameoverScore.width + padX*2;
        var rectH = this.screenGameoverScore.height + padY*2;
        this.screenGameoverScoreBg = this.add.rectangle(rectX, rectY, rectW, rectH, 0x000000).setOrigin(0,0);
        this.screenGameoverScoreBg.setStrokeStyle(6, 0xffde00);
        
        // Try again button
        this.screenGameoverReply = this.add.text(EPT.world.centerX, EPT.world.height-100, 'Try again!', { font: '36px '+EPT.text['FONT'], fill: '#ffde00', stroke: '#000', strokeThickness: 6 });
        this.screenGameoverReply.setOrigin(0.5, 1);
        this.screenGameoverReply.setInteractive({ useHandCursor: true });
        this.screenGameoverReply.on('pointerdown', () => { this.stateRestart(); });
        
        // add to group in correct order
        this.screenGameoverGroup.add(this.screenGameoverBg);
        this.screenGameoverGroup.add(this.screenGameoverScoreBg);
        this.screenGameoverGroup.add(this.screenGameoverScore);
        this.screenGameoverGroup.add(this.screenGameoverText);
        this.screenGameoverGroup.add(this.screenGameoverReply);
        
        // set depths
        var overlayDepth = 200;
        this.screenGameoverBg.setDepth(overlayDepth);
        this.screenGameoverScoreBg.setDepth(overlayDepth+1);
        this.screenGameoverScore.setDepth(overlayDepth+2);
        this.screenGameoverText.setDepth(overlayDepth+2);
        this.screenGameoverReply.setDepth(overlayDepth+2);
        this.screenGameoverGroup.setVisible(true);

        EPT.fadeOutIn(function(self){
            self.buttonPause && (self.buttonPause.input && (self.buttonPause.input.enabled = false));
        }, this);
        
        // gentle idle tween for the reply text
        try {
            this.tweens.add({ targets: this.screenGameoverReply, y: this.screenGameoverReply.y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        } catch(e) {}
    }

    stateBack() {
        EPT.Sfx.play('click');
        EPT.fadeOutScene('MainMenu', this);
    }

    stateRestart() {
        EPT.Sfx.play('click');
        EPT.fadeOutScene('BeaverGame', this);
    }
}
