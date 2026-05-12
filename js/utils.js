// ─── Collision ───────────────────────────────────────────────────
function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    )
}

// ─── Push-apart (Layer 3) ────────────────────────────────────────
// Prevents fighters overlapping. Called every frame before attack detection.
function separateFighters(a, b) {
    const MARGIN = 4   // minimum gap in px
    const overlap = (a.position.x + a.width + MARGIN) - b.position.x

    if (overlap > 0 && a.position.x < b.position.x) {
        const half = overlap / 2
        a.position.x -= half
        b.position.x += half

        // Clamp both to canvas
        if (a.position.x < 0) {
            b.position.x += Math.abs(a.position.x)
            a.position.x  = 0
        }
        if (b.position.x + b.width > 1024) {
            a.position.x -= (b.position.x + b.width - 1024)
            b.position.x  = 1024 - b.width
        }
    }
}

// ─── Win / Tie ────────────────────────────────────────────────────
function determineWinner({ player, enemy, timerId }) {
    clearTimeout(timerId)
    const el = document.querySelector('#displayText')
    el.style.display = 'flex'
    if (player.health === enemy.health) {
        el.innerHTML = 'TIE'
    } else if (player.health > enemy.health) {
        el.innerHTML = 'PLAYER 1 WINS'
    } else {
        el.innerHTML = 'PLAYER 2 WINS'
    }
}

// ─── Timer ───────────────────────────────────────────────────────
let timer   = 100
let timerId
function decreaseTimer() {
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000)
        timer--
        document.querySelector('#timer').innerHTML = timer
    }
    if (timer === 0) {
        determineWinner({ player, enemy, timerId })
    }
}

// ─── Screen Shake (Layer 1) ──────────────────────────────────────
let shakeFrames    = 0
let shakeIntensity = 0

function triggerShake(intensity = 6, duration = 12) {
    shakeIntensity = intensity
    shakeFrames    = duration
}

function applyShake(canvas) {
    if (shakeFrames > 0) {
        const dx = (Math.random() - 0.5) * 2 * shakeIntensity
        const dy = (Math.random() - 0.5) * 2 * shakeIntensity
        canvas.style.transform = `translate(${dx}px, ${dy}px)`
        shakeFrames--
    } else {
        canvas.style.transform = 'translate(0,0)'
        shakeIntensity = 0
    }
}

// ─── Particle System (Layer 1) ───────────────────────────────────
const particles = []

function spawnHitParticles(x, y, color = '#ffffff', count = 8) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.8
        const speed = 2 + Math.random() * 4
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.06 + Math.random() * 0.04,
            radius: 2 + Math.random() * 3,
            color
        })
    }
}

function spawnLandingDust(x, y) {
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 1.2
        const speed = 1 + Math.random() * 2.5
        particles.push({
            x: x + (Math.random() - 0.5) * 30, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            life: 1,
            decay: 0.05 + Math.random() * 0.04,
            radius: 3 + Math.random() * 4,
            color: 'rgba(180,160,120,'
        })
    }
}

// ─── Dash trail (Layer 3) ────────────────────────────────────────
function spawnDashTrail(x, y, direction) {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 40,
            vx: -direction * (1 + Math.random() * 2),
            vy: (Math.random() - 0.5) * 0.8,
            life: 0.7,
            decay: 0.07 + Math.random() * 0.05,
            radius: 4 + Math.random() * 5,
            color: 'rgba(120,160,255,'
        })
    }
}

function updateParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x  += p.vx
        p.y  += p.vy
        p.vy += 0.15
        p.life -= p.decay

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        if (p.color.startsWith('rgba(')) {
            ctx.fillStyle = p.color + p.life + ')'
        } else {
            ctx.fillStyle = p.color
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(0.1, p.radius * p.life), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        if (p.life <= 0) particles.splice(i, 1)
    }
}

// ─── Hit Stop (Layer 1) ──────────────────────────────────────────
let hitStopFrames = 0

function triggerHitStop(frames = 6) {
    hitStopFrames = frames
}

function isHitStopped() {
    if (hitStopFrames > 0) {
        hitStopFrames--
        return true
    }
    return false
}

// ─── Combo Counter (Layer 1 / 2) ─────────────────────────────────
const comboState = {
    player: { count: 0, timer: 0 },
    enemy:  { count: 0, timer: 0 }
}

function registerHit(who) {
    const s = comboState[who]
    s.count++
    s.timer = 120
    renderCombo(who, s.count)
}

function tickCombo() {
    for (const who of ['player', 'enemy']) {
        const s = comboState[who]
        if (s.timer > 0) {
            s.timer--
            if (s.timer === 0) {
                s.count = 0
                hideCombo(who)
            }
        }
    }
}

function renderCombo(who, count) {
    if (count < 2) return
    const el = document.querySelector(who === 'player' ? '#playerCombo' : '#enemyCombo')
    if (!el) return
    el.textContent       = count + ' HIT'
    el.style.opacity     = '1'
    el.style.transform   = 'scale(1.3)'
    setTimeout(() => { el.style.transform = 'scale(1)' }, 120)
}

function hideCombo(who) {
    const el = document.querySelector(who === 'player' ? '#playerCombo' : '#enemyCombo')
    if (el) el.style.opacity = '0'
}

// ─── Crouch indicator (Layer 2) ──────────────────────────────────
// Draws a small "CROUCH" tag below the crouching fighter
function drawCrouchIndicator(ctx, fighter, label) {
    if (!fighter.isCrouching) return
    ctx.save()
    ctx.font         = '9px "Press Start 2P", monospace'
    ctx.fillStyle    = 'rgba(255,200,80,0.75)'
    ctx.textAlign    = 'center'
    ctx.fillText('LOW', fighter.position.x + fighter.width / 2, fighter.position.y + fighter.height + 14)
    ctx.restore()
}
