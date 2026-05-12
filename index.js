const canvas = document.querySelector('canvas')
const c      = canvas.getContext('2d')

canvas.width  = 1024
canvas.height = 576

c.fillRect(0, 0, canvas.width, canvas.height)

const gravity = 0.7

// ── Sprites ──────────────────────────────────────────────────────
const background = new Sprite({
    position: { x: 0, y: 0 },
    imageSrc: './img/background.png'
})
const shop = new Sprite({
    position: { x: 615, y: 128 },
    imageSrc: './img/shop.png',
    scale: 2.75,
    framesMax: 6
})

// ── Fighters ─────────────────────────────────────────────────────
const player = new Fighter({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    offset:   { x: 215, y: 157 },
    imageSrc:  './img/samuraiMack/samuraiMack/Idle.png',
    scale: 2.5,
    framesMax: 8,
    sprites: {
        idle:    { imageSrc: './img/samuraiMack/samuraiMack/Idle.png',                        framesMax: 8 },
        run:     { imageSrc: './img/samuraiMack/samuraiMack/Run.png',                         framesMax: 8 },
        jump:    { imageSrc: './img/samuraiMack/samuraiMack/Jump.png',                        framesMax: 2 },
        fall:    { imageSrc: './img/samuraiMack/samuraiMack/Fall.png',                        framesMax: 2 },
        attack1: { imageSrc: './img/samuraiMack/samuraiMack/Attack1.png',                     framesMax: 6 },
        attack2: { imageSrc: './img/samuraiMack/samuraiMack/Attack2.png',                     framesMax: 6 },
        takeHit: { imageSrc: './img/samuraiMack/samuraiMack/Take Hit - white silhouette.png', framesMax: 4 },
        death:   { imageSrc: './img/samuraiMack/samuraiMack/Death.png',                       framesMax: 6 }
    },
    attackBox: { offset: { x: 100, y: 50 }, width: 160, height: 50 }
})

const enemy = new Fighter({
    position: { x: 400, y: 100 },
    velocity: { x: 0, y: 0 },
    color:    'blue',
    offset:   { x: 215, y: 167 },
    imageSrc:  './img/kenji/kenji/Idle.png',
    scale: 2.5,
    framesMax: 4,
    sprites: {
        idle:    { imageSrc: './img/kenji/kenji/Idle.png',    framesMax: 4 },
        run:     { imageSrc: './img/kenji/kenji/Run.png',     framesMax: 8 },
        jump:    { imageSrc: './img/kenji/kenji/Jump.png',    framesMax: 2 },
        fall:    { imageSrc: './img/kenji/kenji/Fall.png',    framesMax: 2 },
        attack1: { imageSrc: './img/kenji/kenji/Attack1.png', framesMax: 4 },
        attack2: { imageSrc: './img/kenji/kenji/Attack2.png', framesMax: 4 },
        takeHit: { imageSrc: './img/kenji/kenji/Take hit.png',framesMax: 3 },
        death:   { imageSrc: './img/kenji/kenji/Death.png',   framesMax: 7 }
    },
    attackBox: { offset: { x: -170, y: 50 }, width: 170, height: 50 }
})

// ── Input ─────────────────────────────────────────────────────────
const keys = {
    a:          { pressed: false },
    d:          { pressed: false },
    ArrowRight: { pressed: false },
    ArrowLeft:  { pressed: false }
}

// Double-tap dash detection
const doubleTap = {
    player: { key: null, time: 0 },
    enemy:  { key: null, time: 0 }
}
const DASH_WINDOW = 220   // ms

// ── Game state ────────────────────────────────────────────────────
let gameOver = false

decreaseTimer()

// ── Main loop ─────────────────────────────────────────────────────
function animate() {
    window.requestAnimationFrame(animate)

    // Hit stop: draw-only pass
    if (isHitStopped()) {
        c.fillStyle = 'black'
        c.fillRect(0, 0, canvas.width, canvas.height)
        background.draw()
        shop.draw()
        c.fillStyle = 'rgba(255,255,255,0.15)'
        c.fillRect(0, 0, canvas.width, canvas.height)
        player.draw()
        enemy.draw()
        updateParticles(c)
        applyShake(canvas)
        return
    }

    // ── Background ───────────────────────────────────────
    c.fillStyle = 'black'
    c.fillRect(0, 0, canvas.width, canvas.height)
    background.update()
    shop.update()
    c.fillStyle = 'rgba(255,255,255,0.15)'
    c.fillRect(0, 0, canvas.width, canvas.height)

    // ── Fighters ─────────────────────────────────────────
    player.update()
    enemy.update()

    // ── Crouch indicators ────────────────────────────────
    drawCrouchIndicator(c, player, 'P1')
    drawCrouchIndicator(c, enemy,  'P2')

    // ── Particles ────────────────────────────────────────
    updateParticles(c)
    applyShake(canvas)
    tickCombo()

    if (gameOver) return

    // ════════════════════════════════════════════════════
    // PLAYER MOVEMENT (Layer 2 + 3)
    // ════════════════════════════════════════════════════
    player.velocity.x = 0

    const playerOnGround = player.position.y + player.height >= 576

    if (keys.a.pressed && player.lastKey === 'a') {
        player.velocity.x = -5
        if (!player.isCrouching) player.switchSprite('run')
    } else if (keys.d.pressed && player.lastKey === 'd') {
        player.velocity.x = 5
        if (!player.isCrouching) player.switchSprite('run')
    } else {
        if (!player.isCrouching) player.switchSprite('idle')
    }

    // Airborne animation
    if (player.velocity.y < 0)      player.switchSprite('jump')
    else if (player.velocity.y > 0) player.switchSprite('fall')

    // ════════════════════════════════════════════════════
    // ENEMY MOVEMENT
    // ════════════════════════════════════════════════════
    enemy.velocity.x = 0

    if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
        enemy.velocity.x = -5
        if (!enemy.isCrouching) enemy.switchSprite('run')
    } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
        enemy.velocity.x = 5
        if (!enemy.isCrouching) enemy.switchSprite('run')
    } else {
        if (!enemy.isCrouching) enemy.switchSprite('idle')
    }

    if (enemy.velocity.y < 0)      enemy.switchSprite('jump')
    else if (enemy.velocity.y > 0) enemy.switchSprite('fall')

    // ════════════════════════════════════════════════════
    // LAYER 3: Push-apart separation
    // ════════════════════════════════════════════════════
    separateFighters(player, enemy)

    // ════════════════════════════════════════════════════
    // LAYER 2: Crouch scale — squish fighter visually
    // ════════════════════════════════════════════════════
    // (Crouch is purely a state flag — attack2 while crouching = low attack)

    // ════════════════════════════════════════════════════
    // HIT DETECTION
    // ════════════════════════════════════════════════════

    // Player hits enemy
    if (
        rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
        player.isAttacking &&
        player.framesCurrent === 4
    ) {
        const isHeavy    = player.image === player.sprites.attack2.image
        const isAirborne = player._wasAirborne
        enemy.takeHit(player.position.x, isHeavy && !isAirborne)
        player.isAttacking = false
        registerHit('player')
        gsap.to('#enemyHealth', { width: enemy.health + '%' })
    }
    if (player.isAttacking && player.framesCurrent === 4) {
        player.isAttacking = false
    }

    // Enemy hits player
    if (
        rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
        enemy.isAttacking &&
        enemy.framesCurrent === 2
    ) {
        const isHeavy    = enemy.image === enemy.sprites.attack2.image
        const isAirborne = enemy._wasAirborne
        player.takeHit(enemy.position.x, isHeavy && !isAirborne)
        enemy.isAttacking = false
        registerHit('enemy')
        gsap.to('#playerHealth', { width: player.health + '%' })
    }
    if (enemy.isAttacking && enemy.framesCurrent === 2) {
        enemy.isAttacking = false
    }

    // End condition
    if (enemy.health <= 0 || player.health <= 0) {
        gameOver = true
        determineWinner({ player, enemy, timerId })
    }
}

animate()

// ── Key down ──────────────────────────────────────────────────────
window.addEventListener('keydown', (event) => {

    // ── Player 1 ─────────────────────────────────────────
    if (!player.dead) {
        switch (event.key) {
            case 'd':
                // Double-tap dash right
                if (doubleTap.player.key === 'd' && Date.now() - doubleTap.player.time < DASH_WINDOW) {
                    player.tryDash(1)
                    doubleTap.player.key = null
                } else {
                    doubleTap.player = { key: 'd', time: Date.now() }
                }
                keys.d.pressed  = true
                player.lastKey  = 'd'
                break

            case 'a':
                // Double-tap dash left (backdash → iframes)
                if (doubleTap.player.key === 'a' && Date.now() - doubleTap.player.time < DASH_WINDOW) {
                    player.tryDash(-1)
                    doubleTap.player.key = null
                } else {
                    doubleTap.player = { key: 'a', time: Date.now() }
                }
                keys.a.pressed  = true
                player.lastKey  = 'a'
                break

            case 'w':
                // No jump while crouching
                if (!player.isCrouching) player.velocity.y = -20
                break

            case 's':
                // Crouch
                player.isCrouching = true
                break

            case ' ':
                // Light attack — works airborne too
                player.attack1()
                break

            case 'f':
                // Heavy / crouch attack
                player.attack2()
                break
        }
    }

    // ── Player 2 ─────────────────────────────────────────
    if (!enemy.dead) {
        switch (event.key) {
            case 'ArrowRight':
                if (doubleTap.enemy.key === 'ArrowRight' && Date.now() - doubleTap.enemy.time < DASH_WINDOW) {
                    enemy.tryDash(1)
                    doubleTap.enemy.key = null
                } else {
                    doubleTap.enemy = { key: 'ArrowRight', time: Date.now() }
                }
                keys.ArrowRight.pressed = true
                enemy.lastKey           = 'ArrowRight'
                break

            case 'ArrowLeft':
                if (doubleTap.enemy.key === 'ArrowLeft' && Date.now() - doubleTap.enemy.time < DASH_WINDOW) {
                    enemy.tryDash(-1)
                    doubleTap.enemy.key = null
                } else {
                    doubleTap.enemy = { key: 'ArrowLeft', time: Date.now() }
                }
                keys.ArrowLeft.pressed = true
                enemy.lastKey          = 'ArrowLeft'
                break

            case 'ArrowUp':
                if (!enemy.isCrouching) enemy.velocity.y = -20
                break

            case 'ArrowDown':
                // Crouch
                enemy.isCrouching = true
                break

            case 'l':
                // Light attack
                enemy.attack1()
                break

            case ';':
                // Heavy / crouch attack
                enemy.attack2()
                break
        }
    }
})

// ── Key up ────────────────────────────────────────────────────────
window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = false; break
        case 'a': keys.a.pressed = false; break
        case 's': player.isCrouching = false; break   // release crouch
    }
    switch (event.key) {
        case 'ArrowRight': keys.ArrowRight.pressed = false;   break
        case 'ArrowLeft':  keys.ArrowLeft.pressed  = false;   break
        case 'ArrowDown':  enemy.isCrouching       = false;   break   // release crouch
    }
})
