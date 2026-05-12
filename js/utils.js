function rectangularCollision({rectangle1, rectangle2}) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x && 
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    )
}

function determineWinner({player, enemy, timerId}) {
    clearTimeout(timerId)
    document.querySelector('#displayText').style.display = 'flex'
    if (player.health === enemy.health) {
        document.querySelector('#displayText').innerHTML = 'Tie'
    } else if (player.health > enemy.health) {
        document.querySelector('#displayText').innerHTML = 'Player 1 Wins'
    } else if (player.health < enemy.health) {
        document.querySelector('#displayText').innerHTML = 'Player 2 Wins'
    }
}

let timer = 100
let timerId
function decreaseTimer() {
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000)
        timer--
        document.querySelector('#timer').innerHTML = timer
    }
    if (timer === 0) {
        determineWinner({player, enemy, timerId})
    }
}

// ─── Screen Shake ───────────────────────────────────────────────
let shakeFrames = 0
let shakeIntensity = 0

function triggerShake(intensity = 6, duration = 12) {
    shakeIntensity = intensity
    shakeFrames = duration
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

// ─── Particle System ─────────────────────────────────────────────
const particles = []

function spawnHitParticles(x, y, color = '#ffffff', count = 8) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.8
        const speed = 2 + Math.random() * 4
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,          // 1 = full, 0 = dead
            decay: 0.06 + Math.random() * 0.04,
            radius: 2 + Math.random() * 3,
            color
        })
    }
}

function spawnLandingDust(x, y) {
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 1.2  // spread upward
        const speed = 1 + Math.random() * 2.5
        particles.push({
            x: x + (Math.random() - 0.5) * 30,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            life: 1,
            decay: 0.05 + Math.random() * 0.04,
            radius: 3 + Math.random() * 4,
            color: 'rgba(180,160,120,'
        })
    }
}

function updateParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.15          // gravity pull
        p.life -= p.decay

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        if (p.color.startsWith('rgba(')) {
            ctx.fillStyle = p.color + p.life + ')'
        } else {
            ctx.fillStyle = p.color
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        if (p.life <= 0) particles.splice(i, 1)
    }
}

// ─── Hit Stop ────────────────────────────────────────────────────
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

// ─── Combo Counter ───────────────────────────────────────────────
const comboState = {
    player: { count: 0, timer: 0 },
    enemy:  { count: 0, timer: 0 }
}

function registerHit(who) {
    const s = comboState[who]
    s.count++
    s.timer = 120   // frames before combo resets (~2s at 60fps)
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
    el.textContent = count + ' HIT'
    el.style.opacity = '1'
    el.style.transform = 'scale(1.3)'
    setTimeout(() => { el.style.transform = 'scale(1)' }, 120)
}

function hideCombo(who) {
    const el = document.querySelector(who === 'player' ? '#playerCombo' : '#enemyCombo')
    if (el) el.style.opacity = '0'
}
