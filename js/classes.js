class Sprite {
    constructor({ position, imageSrc, scale = 1, framesMax = 1, offset = { x: 0, y: 0 } }) {
        this.position = position
        this.width = 50
        this.height = 150
        this.image = new Image()
        this.image.src = imageSrc
        this.scale = scale
        this.framesMax = framesMax
        this.framesCurrent = 0
        this.framesElapsed = 0
        this.framesHold = 20
        this.offset = offset
    }

    draw() {
        c.drawImage(
            this.image,
            this.framesCurrent * (this.image.width / this.framesMax), 0,
            this.image.width / this.framesMax, this.image.height,
            this.position.x - this.offset.x,
            this.position.y - this.offset.y,
            (this.image.width / this.framesMax) * this.scale,
            this.image.height * this.scale
        )
    }

    animateFrames() {
        this.framesElapsed++
        if (this.framesElapsed % this.framesHold === 0) {
            if (this.framesCurrent < this.framesMax - 1) {
                this.framesCurrent++
            } else {
                this.framesCurrent = 0
            }
        }
    }

    update() {
        this.draw()
        this.animateFrames()
    }
}

class Fighter extends Sprite {
    constructor({
        position,
        velocity,
        color = 'red',
        imageSrc,
        scale = 1,
        framesMax = 1,
        offset = { x: 0, y: 0 },
        sprites,
        attackBox = { offset: {}, width: undefined, height: undefined }
    }) {
        super({ position, imageSrc, scale, framesMax, offset })

        this.velocity    = velocity
        this.width       = 50
        this.height      = 150
        this.health      = 100
        this.color       = color
        this.isAttacking = false
        this.dead        = false
        this.sprites     = sprites
        this.lastKey     = ''

        // ── Knockback (Layer 1) ─────────────────────────────
        this.knockbackVelocity = 0
        this.knockbackDecay    = 0.75
        this._wasAirborne      = false

        // ── Crouch (Layer 2) ────────────────────────────────
        this.isCrouching = false

        // ── Dash (Layer 3) ──────────────────────────────────
        this.dashFrames      = 0           // frames remaining in dash
        this.dashCooldown    = 0           // prevent infinite dash spam
        this.dashSpeed       = 14          // horizontal velocity during dash
        this.dashDirection   = 0           // +1 forward / -1 back

        // Double-tap detection
        this._lastTapKey     = null
        this._lastTapTime    = 0
        this.TAP_WINDOW      = 220          // ms between taps to register dash

        // ── Invincibility frames (backdash) ─────────────────
        this.iframes         = 0

        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            offset:   attackBox.offset,
            width:    attackBox.width,
            height:   attackBox.height
        }

        for (const key in sprites) {
            sprites[key].image = new Image()
            sprites[key].image.src = sprites[key].imageSrc
        }
    }

    // ── Public: try to dash in direction (+1 / -1) ───────────────
    tryDash(direction) {
        if (this.dashCooldown > 0 || this.dashFrames > 0 || this.dead) return
        this.dashFrames   = 10
        this.dashCooldown = 28
        this.dashDirection = direction
        // Backdash gets 6 iframes
        if (direction === -1) this.iframes = 6
        spawnDashTrail(this.position.x + this.width / 2, this.position.y + this.height / 2, direction)
    }

    // ── attack1: light / airborne attack ─────────────────────────
    attack1() {
        if (this.isAttacking || this.dead) return
        this.switchSprite('attack1')
        this.isAttacking = true
    }

    // ── attack2: heavy (grounded) or crouch attack ───────────────
    attack2() {
        if (this.isAttacking || this.dead) return
        this.switchSprite('attack2')
        this.isAttacking = true
    }

    // ── takeHit with all Layer 1 effects ─────────────────────────
    takeHit(attackerX, isHeavy = false) {
        // Invincibility frames from backdash
        if (this.iframes > 0) return

        this.health -= isHeavy ? 25 : 20
        this.switchSprite('takeHit')

        const direction = this.position.x > attackerX ? 1 : -1
        this.knockbackVelocity = direction * (isHeavy ? 10 : 6)

        triggerHitStop(isHeavy ? 9 : 5)
        triggerShake(isHeavy ? 8 : 4, isHeavy ? 14 : 8)

        const hitX = this.position.x + this.width / 2
        const hitY = this.position.y + this.height * 0.35
        spawnHitParticles(hitX, hitY, isHeavy ? '#ffcc00' : '#ffffff', isHeavy ? 12 : 7)
    }

    update() {
        this.draw()
        if (!this.dead) this.animateFrames()

        // ── Tick cooldowns ─────────────────────────────────
        if (this.dashCooldown > 0) this.dashCooldown--
        if (this.iframes > 0)      this.iframes--

        // ── Dash override velocity ─────────────────────────
        if (this.dashFrames > 0) {
            this.velocity.x = this.dashDirection * this.dashSpeed
            this.dashFrames--
            this.switchSprite('run')
        }

        // ── Knockback ──────────────────────────────────────
        if (Math.abs(this.knockbackVelocity) > 0.1) {
            this.position.x   += this.knockbackVelocity
            this.knockbackVelocity *= this.knockbackDecay
        } else {
            this.knockbackVelocity = 0
        }

        // ── Horizontal movement + canvas clamp ────────────
        this.position.x += this.velocity.x
        if (this.position.x < 0)                       this.position.x = 0
        if (this.position.x + this.width > 1024)       this.position.x = 1024 - this.width

        // ── Gravity & ground ───────────────────────────────
        const wasAirborne = (this.position.y + this.height) < 576
        this.position.y  += this.velocity.y
        this.velocity.y  += gravity

        if (this.position.y + this.height >= 576) {
            this.velocity.y = 0
            this.position.y = 576 - this.height
            if (wasAirborne && this._wasAirborne) {
                spawnLandingDust(
                    this.position.x + this.width / 2,
                    this.position.y + this.height
                )
            }
        }
        this._wasAirborne = (this.position.y + this.height) < 576

        // ── Attack box ─────────────────────────────────────
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y
    }

    switchSprite(sprite) {
        if (this.image === this.sprites.death.image) {
            if (this.framesCurrent === this.sprites.death.framesMax - 1) this.dead = true
            return
        }

        if (
            (this.image === this.sprites.attack1.image && this.framesCurrent < this.sprites.attack1.framesMax - 1) ||
            (this.image === this.sprites.attack2.image && this.framesCurrent < this.sprites.attack2.framesMax - 1) ||
            (this.image === this.sprites.takeHit.image && this.framesCurrent < this.sprites.takeHit.framesMax - 1)
        ) return

        const s = this.sprites[sprite]
        if (!s || this.image === s.image) return
        this.image         = s.image
        this.framesMax     = s.framesMax
        this.framesCurrent = 0
    }
}
