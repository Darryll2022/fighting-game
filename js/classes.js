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

        // ── Knockback ──────────────────────────────────────
        this.knockbackVelocity = 0   // horizontal impulse when hit
        this.knockbackDecay    = 0.75

        // ── Was airborne last frame (for landing dust) ──
        this._wasAirborne = false

        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            offset:   attackBox.offset,
            width:    attackBox.width,
            height:   attackBox.height
        }

        // Preload all sprites
        for (const key in sprites) {
            sprites[key].image = new Image()
            sprites[key].image.src = sprites[key].imageSrc
        }
    }

    update() {
        this.draw()
        if (!this.dead) this.animateFrames()

        // ── Knockback ──────────────────────────────────────
        if (Math.abs(this.knockbackVelocity) > 0.1) {
            this.position.x += this.knockbackVelocity
            this.knockbackVelocity *= this.knockbackDecay
        } else {
            this.knockbackVelocity = 0
        }

        // ── Clamp to canvas bounds ─────────────────────────
        if (this.position.x < 0) this.position.x = 0
        if (this.position.x + this.width > 1024) this.position.x = 1024 - this.width

        // ── Gravity & ground ───────────────────────────────
        const wasAirborne = this.position.y + this.height < 576
        this.position.y  += this.velocity.y
        this.velocity.y  += gravity

        if (this.position.y + this.height >= 576) {
            this.velocity.y    = 0
            this.position.y    = 576 - this.height

            // Landing dust — only on the frame we just landed
            if (wasAirborne && this._wasAirborne) {
                spawnLandingDust(
                    this.position.x + this.width / 2,
                    this.position.y + this.height
                )
            }
        }
        this._wasAirborne = (this.position.y + this.height < 576)

        // ── Attack box position ────────────────────────────
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y

        // ── Attack box debug (uncomment to visualise) ──────
        // c.fillStyle = 'rgba(255,0,0,0.3)'
        // c.fillRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.width, this.attackBox.height)
    }

    // ── Apply a hit and trigger all Layer 1 effects ──────────────
    takeHit(attackerX, isHeavy = false) {
        this.health -= isHeavy ? 25 : 20

        // 1. Play takeHit animation
        this.switchSprite('takeHit')

        // 2. Knockback — push away from attacker
        const direction = this.position.x > attackerX ? 1 : -1
        this.knockbackVelocity = direction * (isHeavy ? 10 : 6)

        // 3. Hit stop
        triggerHitStop(isHeavy ? 9 : 5)

        // 4. Screen shake
        triggerShake(isHeavy ? 8 : 4, isHeavy ? 14 : 8)

        // 5. Hit particles at contact point
        const hitX = this.position.x + this.width / 2
        const hitY = this.position.y + this.height * 0.35
        spawnHitParticles(hitX, hitY, isHeavy ? '#ffcc00' : '#ffffff', isHeavy ? 12 : 7)
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

    switchSprite(sprite) {
        // Death is terminal
        if (this.image === this.sprites.death.image) {
            if (this.framesCurrent === this.sprites.death.framesMax - 1) this.dead = true
            return
        }

        // Don't interrupt attacks or takeHit mid-animation
        if (
            (this.image === this.sprites.attack1.image && this.framesCurrent < this.sprites.attack1.framesMax - 1) ||
            (this.image === this.sprites.attack2.image && this.framesCurrent < this.sprites.attack2.framesMax - 1) ||
            (this.image === this.sprites.takeHit.image && this.framesCurrent < this.sprites.takeHit.framesMax - 1)
        ) return

        switch (sprite) {
            case 'idle':
                if (this.image !== this.sprites.idle.image) {
                    this.image = this.sprites.idle.image
                    this.framesMax = this.sprites.idle.framesMax
                    this.framesCurrent = 0
                }
                break
            case 'run':
                if (this.image !== this.sprites.run.image) {
                    this.image = this.sprites.run.image
                    this.framesMax = this.sprites.run.framesMax
                    this.framesCurrent = 0
                }
                break
            case 'jump':
                if (this.image !== this.sprites.jump.image) {
                    this.image = this.sprites.jump.image
                    this.framesMax = this.sprites.jump.framesMax
                    this.framesCurrent = 0
                }
                break
            case 'fall':
                if (this.image !== this.sprites.fall.image) {
                    this.image = this.sprites.fall.image
                    this.framesMax = this.sprites.fall.framesMax
                    this.framesCurrent = 0
                }
                break
            case 'attack1':
                if (this.image !== this.sprites.attack1.image) {
                    this.image = this.sprites.attack1.image
                    this.framesMax = this.sprites.attack1.framesMax
                    this.framesCurrent = 0
                }
                break
            case 'attack2':
                if (this.image !== this.sprites.attack2.image) {
                    this.image = this.sprites.attack2.image
                    this.framesMax = this.sprites.attack2.framesMax
                    this.framesCurrent = 0
                }
                break
            case 'takeHit':
                if (this.image !== this.sprites.takeHit.image) {
                    this.image = this.sprites.takeHit.image
                    this.framesMax = this.sprites.takeHit.framesMax
                    this.framesCurrent = 0
                }
                break
            case 'death':
                if (this.image !== this.sprites.death.image) {
                    this.image = this.sprites.death.image
                    this.framesMax = this.sprites.death.framesMax
                    this.framesCurrent = 0
                }
                break
        }
    }
}
