const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width  = 1024
canvas.height = 576

c.fillRect(0, 0, canvas.width, canvas.height)

const gravity = 0.7

// ── Sprites ─────────────────────────────────────────────────────
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
    offset:   { x: 0, y: 0 },
    imageSrc:  './img/samuraiMack/samuraiMack/Idle.png',
    scale:     2.5,
    framesMax: 8,
    offset:    { x: 215, y: 157 },
    sprites: {
        idle:    { imageSrc: './img/samuraiMack/samuraiMack/Idle.png',                       framesMax: 8 },
        run:     { imageSrc: './img/samuraiMack/samuraiMack/Run.png',                        framesMax: 8 },
        jump:    { imageSrc: './img/samuraiMack/samuraiMack/Jump.png',                       framesMax: 2 },
        fall:    { imageSrc: './img/samuraiMack/samuraiMack/Fall.png',                       framesMax: 2 },
        attack1: { imageSrc: './img/samuraiMack/samuraiMack/Attack1.png',                    framesMax: 6 },
        attack2: { imageSrc: './img/samuraiMack/samuraiMack/Attack2.png',                    framesMax: 6 },
        takeHit: { imageSrc: './img/samuraiMack/samuraiMack/Take Hit - white silhouette.png',framesMax: 4 },
        death:   { imageSrc: './img/samuraiMack/samuraiMack/Death.png',                      framesMax: 6 }
    },
    attackBox: { offset: { x: 100, y: 50 }, width: 160, height: 50 }
})

const enemy = new Fighter({
    position: { x: 400, y: 100 },
    velocity: { x: 0, y: 0 },
    color:    'blue',
    offset:   { x: 215, y: 167 },
    imageSrc:  './img/kenji/kenji/Idle.png',
    scale:     2.5,
    framesMax: 4,
    sprites: {
        idle:    { imageSrc: './img/kenji/kenji/Idle.png',   framesMax: 4 },
        run:     { imageSrc: './img/kenji/kenji/Run.png',    framesMax: 8 },
        jump:    { imageSrc: './img/kenji/kenji/Jump.png',   framesMax: 2 },
        fall:    { imageSrc: './img/kenji/kenji/Fall.png',   framesMax: 2 },
        attack1: { imageSrc: './img/kenji/kenji/Attack1.png',framesMax: 4 },
        attack2: { imageSrc: './img/kenji/kenji/Attack2.png',framesMax: 4 },
        takeHit: { imageSrc: './img/kenji/kenji/Take hit.png',framesMax: 3 },
        death:   { imageSrc: './img/kenji/kenji/Death.png',  framesMax: 7 }
    },
    attackBox: { offset: { x: -170, y: 50 }, width: 170, height: 50 }
})

// ── Input state ──────────────────────────────────────────────────
const keys = {
    a:          { pressed: false },
    d:          { pressed: false },
    w:          { pressed: false },
    ArrowRight: { pressed: false },
    ArrowLeft:  { pressed: false },
    ArrowUp:    { pressed: false }
}

// ── Game state ───────────────────────────────────────────────────
let gameOver = false

decreaseTimer()

// ── Main loop ────────────────────────────────────────────────────
function animate() {
    window.requestAnimationFrame(animate)

    // Hit stop: freeze all game logic for N frames
    if (isHitStopped()) {
        // Still need to draw — just don't update state
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

    // ── Draw background ──────────────────────────────────────────
    c.fillStyle = 'black'
    c.fillRect(0, 0, canvas.width, canvas.height)
    background.update()
    shop.update()
    c.fillStyle = 'rgba(255,255,255,0.15)'
    c.fillRect(0, 0, canvas.width, canvas.height)

    // ── Update fighters ──────────────────────────────────────────
    player.update()
    enemy.update()

    // ── Particles ────────────────────────────────────────────────
    updateParticles(c)

    // ── Screen shake ─────────────────────────────────────────────
    applyShake(canvas)

    // ── Combo tick ───────────────────────────────────────────────
    tickCombo()

    if (gameOver) return

    // ── Player movement ──────────────────────────────────────────
    player.velocity.x = 0
    if (keys.a.pressed && player.lastKey === 'a') {
        player.velocity.x = -5
        player.switchSprite('run')
    } else if (keys.d.pressed && player.lastKey === 'd') {
        player.velocity.x = 5
        player.switchSprite('run')
    } else {
        player.switchSprite('idle')
    }

    if (player.velocity.y < 0)      player.switchSprite('jump')
    else if (player.velocity.y > 0) player.switchSprite('fall')

    // ── Enemy movement ───────────────────────────────────────────
    enemy.velocity.x = 0
    if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
        enemy.velocity.x = -5
        enemy.switchSprite('run')
    } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
        enemy.velocity.x = 5
        enemy.switchSprite('run')
    } else {
        enemy.switchSprite('idle')
    }

    if (enemy.velocity.y < 0)      enemy.switchSprite('jump')
    else if (enemy.velocity.y > 0) enemy.switchSprite('fall')

    // ── Collision: player hits enemy ─────────────────────────────
    if (
        rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
        player.isAttacking &&
        player.framesCurrent === 4
    ) {
        const isHeavy = player.image === player.sprites.attack2.image
        enemy.takeHit(player.position.x, isHeavy)
        player.isAttacking = false
        registerHit('player')
        gsap.to('#enemyHealth', { width: enemy.health + '%' })
    }

    // Player attack misses
    if (player.isAttacking && player.framesCurrent === 4) {
        player.isAttacking = false
    }

    // ── Collision: enemy hits player ─────────────────────────────
    if (
        rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
        enemy.isAttacking &&
        enemy.framesCurrent === 2
    ) {
        const isHeavy = enemy.image === enemy.sprites.attack2.image
        player.takeHit(enemy.position.x, isHeavy)
        enemy.isAttacking = false
        registerHit('enemy')
        gsap.to('#playerHealth', { width: player.health + '%' })
    }

    // Enemy attack misses
    if (enemy.isAttacking && enemy.framesCurrent === 2) {
        enemy.isAttacking = false
    }

    // ── End condition ────────────────────────────────────────────
    if (enemy.health <= 0 || player.health <= 0) {
        gameOver = true
        determineWinner({ player, enemy, timerId })
    }
}

animate()

// ── Key listeners ────────────────────────────────────────────────
window.addEventListener('keydown', (event) => {
    if (!player.dead) {
        switch (event.key) {
            case 'd': keys.d.pressed = true; player.lastKey = 'd'; break
            case 'a': keys.a.pressed = true; player.lastKey = 'a'; break
            case 'w': player.velocity.y = -20; break
            case ' ': player.attack1(); break
            case 's': player.attack2(); break
        }
    }

    if (!enemy.dead) {
        switch (event.key) {
            case 'ArrowRight': keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight'; break
            case 'ArrowLeft':  keys.ArrowLeft.pressed  = true; enemy.lastKey = 'ArrowLeft';  break
            case 'ArrowUp':    enemy.velocity.y = -20; break
            case 'ArrowDown':  enemy.attack1(); break
            case 'Shift':      enemy.attack2(); break
        }
    }
})

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = false; break
        case 'a': keys.a.pressed = false; break
        case 'w': keys.w.pressed = false; break
    }
    switch (event.key) {
        case 'ArrowRight': keys.ArrowRight.pressed = false; break
        case 'ArrowLeft':  keys.ArrowLeft.pressed  = false; break
        case 'ArrowUp':    keys.ArrowUp.pressed    = false; break
    }
})
