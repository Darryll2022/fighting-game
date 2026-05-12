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
        this.framesHold = 10
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

// Per-sprite animation speeds. Lower = faster. At 60fps: hold=5 → 12fps anim.
const ANIM_SPEED = {
    idle:         10,
    run:           6,
    jump:          8,
    fall:          8,
    attack1:       5,
    attack2:       6,
    takeHit:       5,
    death:         8,
    crouch:       12,
    crouchAttack:  5,
}

class Fighter extends Sprite {
    constructor({
        position, velocity, color = 'red', imageSrc,
        scale = 1, framesMax = 1, offset = { x: 0, y: 0 },
        sprites, attackBox = { offset: {}, width: undefined, height: undefined }
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
        this.knockbackVelocity = 0
        this.knockbackDecay    = 0.75
        this._wasAirborne      = false
        this.isCrouching       = false
        this.dashFrames    = 0
        this.dashCooldown  = 0
        this.dashSpeed     = 14
        this.dashDirection = 0
        this.iframes       = 0
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

    tryDash(direction) {
        if (this.dashCooldown > 0 || this.dashFrames > 0 || this.dead) return
        this.dashFrames    = 10
        this.dashCooldown  = 28
        this.dashDirection = direction
        if (direction === -1) this.iframes = 6
        spawnDashTrail(this.position.x + this.width / 2, this.position.y + this.height / 2, direction)
    }

    attack1() {
        if (this.isAttacking || this.dead) return
        this.switchSprite('attack1')
        this.isAttacking = true
    }

    attack2() {
        if (this.isAttacking || this.dead) return
        this.switchSprite('attack2')
        this.isAttacking = true
    }

    crouchAttack() {
        if (this.isAttacking || this.dead) return
        this.switchSprite('crouchAttack')
        this.isAttacking = true
    }

    // FIX 5: health clamped to 0
    takeHit(attackerX, isHeavy = false) {
        if (this.iframes > 0) return
        this.health = Math.max(0, this.health - (isHeavy ? 25 : 20))
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
        if (this.dashCooldown > 0) this.dashCooldown--
        if (this.iframes > 0)      this.iframes--
        if (this.dashFrames > 0) {
            this.velocity.x = this.dashDirection * this.dashSpeed
            this.dashFrames--
            this.switchSprite('run')
        }
        if (Math.abs(this.knockbackVelocity) > 0.1) {
            this.position.x       += this.knockbackVelocity
            this.knockbackVelocity *= this.knockbackDecay
        } else {
            this.knockbackVelocity = 0
        }
        this.position.x += this.velocity.x
        if (this.position.x < 0)                 this.position.x = 0
        if (this.position.x + this.width > 1024) this.position.x = 1024 - this.width
        const wasAirborne = (this.position.y + this.height) < 576
        this.position.y  += this.velocity.y
        this.velocity.y  += gravity
        if (this.position.y + this.height >= 576) {
            this.velocity.y = 0
            this.position.y = 576 - this.height
            if (wasAirborne && this._wasAirborne) {
                spawnLandingDust(this.position.x + this.width / 2, this.position.y + this.height)
            }
        }
        this._wasAirborne = (this.position.y + this.height) < 576
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y
    }

    // FIX 3: set framesHold per-sprite on switch
    switchSprite(sprite) {
        if (this.image === this.sprites.death.image) {
            if (this.framesCurrent === this.sprites.death.framesMax - 1) this.dead = true
            return
        }
        const s = this.sprites
        if (
            (this.image === s.attack1.image      && this.framesCurrent < s.attack1.framesMax - 1)      ||
            (this.image === s.attack2.image      && this.framesCurrent < s.attack2.framesMax - 1)      ||
            (this.image === s.crouchAttack.image && this.framesCurrent < s.crouchAttack.framesMax - 1) ||
            (this.image === s.takeHit.image      && this.framesCurrent < s.takeHit.framesMax - 1)
        ) return
        const target = this.sprites[sprite]
        if (!target || this.image === target.image) return
        this.image         = target.image
        this.framesMax     = target.framesMax
        this.framesCurrent = 0
        this.framesHold    = ANIM_SPEED[sprite] || 10  // FIX 3
    }
}
