const canvas = document.querySelector('canvas')
const c      = canvas.getContext('2d')
canvas.width  = 1024
canvas.height = 576
c.fillRect(0, 0, canvas.width, canvas.height)
const gravity = 0.7

// FIX 6: gate — game input blocked until overlay dismissed
let gameStarted = false

const background = new Sprite({ position: { x: 0, y: 0 }, imageSrc: './img/background.png' })
const shop = new Sprite({ position: { x: 615, y: 128 }, imageSrc: './img/shop.png', scale: 2.75, framesMax: 6 })

// FIX 2: player starts at x=215 so sprite (x - offset.x = 215-215 = 0) is visible at left edge
const player = new Fighter({
    position: { x: 215, y: 0 },
    velocity: { x: 0, y: 0 },
    offset:   { x: 215, y: 157 },
    imageSrc:  './img/samuraiMack/samuraiMack/Idle.png',
    scale: 2.5, framesMax: 8,
    sprites: {
        idle:         { imageSrc: './img/samuraiMack/samuraiMack/Idle.png',                        framesMax: 8 },
        run:          { imageSrc: './img/samuraiMack/samuraiMack/Run.png',                         framesMax: 8 },
        jump:         { imageSrc: './img/samuraiMack/samuraiMack/Jump.png',                        framesMax: 2 },
        fall:         { imageSrc: './img/samuraiMack/samuraiMack/Fall.png',                        framesMax: 2 },
        attack1:      { imageSrc: './img/samuraiMack/samuraiMack/Attack1.png',                     framesMax: 6 },
        attack2:      { imageSrc: './img/samuraiMack/samuraiMack/Attack2.png',                     framesMax: 6 },
        takeHit:      { imageSrc: './img/samuraiMack/samuraiMack/Take Hit - white silhouette.png', framesMax: 4 },
        death:        { imageSrc: './img/samuraiMack/samuraiMack/Death.png',                       framesMax: 6 },
        crouch:       { imageSrc: './img/samuraiMack/samuraiMack/Crouch.png',                      framesMax: 4 },
        crouchAttack: { imageSrc: './img/samuraiMack/samuraiMack/CrouchAttack.png',                framesMax: 4 }
    },
    attackBox: { offset: { x: 100, y: 50 }, width: 160, height: 50 }
})

const enemy = new Fighter({
    position: { x: 700, y: 0 },
    velocity: { x: 0, y: 0 },
    color: 'blue',
    offset: { x: 215, y: 167 },
    imageSrc: './img/kenji/kenji/Idle.png',
    scale: 2.5, framesMax: 4,
    sprites: {
        idle:         { imageSrc: './img/kenji/kenji/Idle.png',          framesMax: 4 },
        run:          { imageSrc: './img/kenji/kenji/Run.png',           framesMax: 8 },
        jump:         { imageSrc: './img/kenji/kenji/Jump.png',          framesMax: 2 },
        fall:         { imageSrc: './img/kenji/kenji/Fall.png',          framesMax: 2 },
        attack1:      { imageSrc: './img/kenji/kenji/Attack1.png',       framesMax: 4 },
        attack2:      { imageSrc: './img/kenji/kenji/Attack2.png',       framesMax: 4 },
        takeHit:      { imageSrc: './img/kenji/kenji/Take hit.png',      framesMax: 3 },
        death:        { imageSrc: './img/kenji/kenji/Death.png',         framesMax: 7 },
        crouch:       { imageSrc: './img/kenji/kenji/Crouch.png',        framesMax: 4 },
        crouchAttack: { imageSrc: './img/kenji/kenji/CrouchAttack.png',  framesMax: 4 }
    },
    attackBox: { offset: { x: -170, y: 50 }, width: 170, height: 50 }
})

const keys = {
    a:          { pressed: false },
    d:          { pressed: false },
    ArrowRight: { pressed: false },
    ArrowLeft:  { pressed: false }
}
const doubleTap = { player: { key: null, time: 0 }, enemy: { key: null, time: 0 } }
const DASH_WINDOW = 220
let gameOver = false

decreaseTimer()

function animate() {
    window.requestAnimationFrame(animate)

    if (isHitStopped()) {
        c.fillStyle = 'black'
        c.fillRect(0, 0, canvas.width, canvas.height)
        background.draw(); shop.draw()
        c.fillStyle = 'rgba(255,255,255,0.15)'
        c.fillRect(0, 0, canvas.width, canvas.height)
        player.draw(); enemy.draw()
        updateParticles(c); applyShake(canvas)
        return
    }

    c.fillStyle = 'black'
    c.fillRect(0, 0, canvas.width, canvas.height)
    background.update(); shop.update()
    c.fillStyle = 'rgba(255,255,255,0.15)'
    c.fillRect(0, 0, canvas.width, canvas.height)

    player.update(); enemy.update()
    drawCrouchIndicator(c, player)
    drawCrouchIndicator(c, enemy)
    updateParticles(c); applyShake(canvas); tickCombo()

    if (!gameStarted || gameOver) return

    // ── Player movement ──────────────────────────────────
    player.velocity.x = 0
    const playerOnGround = player.position.y + player.height >= 574
    if (player.isCrouching && playerOnGround) {
        player.switchSprite('crouch')
    } else if (keys.a.pressed && player.lastKey === 'a') {
        player.velocity.x = -5; player.switchSprite('run')
    } else if (keys.d.pressed && player.lastKey === 'd') {
        player.velocity.x = 5; player.switchSprite('run')
    } else {
        player.switchSprite('idle')
    }
    if (player.velocity.y < 0)      player.switchSprite('jump')
    else if (player.velocity.y > 0) player.switchSprite('fall')

    // ── Enemy movement ───────────────────────────────────
    enemy.velocity.x = 0
    const enemyOnGround = enemy.position.y + enemy.height >= 574
    if (enemy.isCrouching && enemyOnGround) {
        enemy.switchSprite('crouch')
    } else if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
        enemy.velocity.x = -5; enemy.switchSprite('run')
    } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
        enemy.velocity.x = 5; enemy.switchSprite('run')
    } else {
        enemy.switchSprite('idle')
    }
    if (enemy.velocity.y < 0)      enemy.switchSprite('jump')
    else if (enemy.velocity.y > 0) enemy.switchSprite('fall')

    separateFighters(player, enemy)

    // ── Hit detection: player hits enemy ─────────────────
    // FIX 4: crouchAttack (4 frames, 0-3) → hit at frame 2
    //        regular attacks (6 frames, 0-5) → hit at frame 4
    const playerIsCrouchAtk = player.image === player.sprites.crouchAttack.image
    const playerHitFrame    = playerIsCrouchAtk ? 2 : 4

    if (
        rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
        player.isAttacking && player.framesCurrent === playerHitFrame
    ) {
        const isHeavy = (player.image === player.sprites.attack2.image) && !player._wasAirborne
        enemy.takeHit(player.position.x, isHeavy)
        player.isAttacking = false
        registerHit('player')
        gsap.to('#enemyHealth', { width: enemy.health + '%' })
    }
    if (player.isAttacking && player.framesCurrent === playerHitFrame) player.isAttacking = false

    // ── Hit detection: enemy hits player ─────────────────
    // Kenji: all attack sprites are 4-frame → hit at frame 2
    if (
        rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
        enemy.isAttacking && enemy.framesCurrent === 2
    ) {
        const isHeavy = (enemy.image === enemy.sprites.attack2.image) && !enemy._wasAirborne
        player.takeHit(enemy.position.x, isHeavy)
        enemy.isAttacking = false
        registerHit('enemy')
        gsap.to('#playerHealth', { width: player.health + '%' })
    }
    if (enemy.isAttacking && enemy.framesCurrent === 2) enemy.isAttacking = false

    // ── End condition (FIX 7: death anim first) ──────────
    if (enemy.health <= 0 || player.health <= 0) {
        gameOver = true
        if (player.health <= 0) player.switchSprite('death')
        if (enemy.health  <= 0) enemy.switchSprite('death')
        setTimeout(() => { determineWinner({ player, enemy, timerId }) }, 1000)
    }
}

animate()

window.addEventListener('keydown', (event) => {
    if (!gameStarted) return   // FIX 6

    if (!player.dead) {
        switch (event.key) {
            case 'd':
                if (doubleTap.player.key === 'd' && Date.now() - doubleTap.player.time < DASH_WINDOW) {
                    player.tryDash(1); doubleTap.player.key = null
                } else { doubleTap.player = { key: 'd', time: Date.now() } }
                keys.d.pressed = true; player.lastKey = 'd'; break
            case 'a':
                if (doubleTap.player.key === 'a' && Date.now() - doubleTap.player.time < DASH_WINDOW) {
                    player.tryDash(-1); doubleTap.player.key = null
                } else { doubleTap.player = { key: 'a', time: Date.now() } }
                keys.a.pressed = true; player.lastKey = 'a'; break
            case 'w': if (!player.isCrouching) player.velocity.y = -20; break
            case 's': player.isCrouching = true; break
            case ' ': player.attack1(); break
            case 'f': player.isCrouching ? player.crouchAttack() : player.attack2(); break
        }
    }

    if (!enemy.dead) {
        switch (event.key) {
            case 'ArrowRight':
                if (doubleTap.enemy.key === 'ArrowRight' && Date.now() - doubleTap.enemy.time < DASH_WINDOW) {
                    enemy.tryDash(1); doubleTap.enemy.key = null
                } else { doubleTap.enemy = { key: 'ArrowRight', time: Date.now() } }
                keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight'; break
            case 'ArrowLeft':
                if (doubleTap.enemy.key === 'ArrowLeft' && Date.now() - doubleTap.enemy.time < DASH_WINDOW) {
                    enemy.tryDash(-1); doubleTap.enemy.key = null
                } else { doubleTap.enemy = { key: 'ArrowLeft', time: Date.now() } }
                keys.ArrowLeft.pressed = true; enemy.lastKey = 'ArrowLeft'; break
            case 'ArrowUp': if (!enemy.isCrouching) enemy.velocity.y = -20; break
            case 'ArrowDown': enemy.isCrouching = true; break
            case 'l': enemy.attack1(); break
            case ';': enemy.isCrouching ? enemy.crouchAttack() : enemy.attack2(); break
        }
    }
})

window.addEventListener('keyup', (event) => {
    if (!gameStarted) return
    switch (event.key) {
        case 'd': keys.d.pressed = false; break
        case 'a': keys.a.pressed = false; break
        case 's': player.isCrouching = false; break
    }
    switch (event.key) {
        case 'ArrowRight': keys.ArrowRight.pressed = false; break
        case 'ArrowLeft':  keys.ArrowLeft.pressed  = false; break
        case 'ArrowDown':  enemy.isCrouching       = false; break
    }
})
