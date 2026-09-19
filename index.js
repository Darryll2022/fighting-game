const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

c.fillRect(0, 0, canvas.width, canvas.height)


const gravity = 0.7


const background = new Sprite({
    position: {
        x: 0 ,
        y: 0
    },
    imageSrc: './img/background.png'
})

const shop = new Sprite({
    position: {
        x: 615 ,
        y: 128
    },
    imageSrc: './img/shop.png',
    scale: 2.75 ,
    framesMax: 6
})

const player = new Fighter({
    position: {
    x: 0,
    y: 0
 },
 velocity: {
     x: 0,
     y: 0
 },
 offset: {
    x: 0,
    y: 0
 },
 imageSrc: './img/samuraiMack/samuraiMack/Idle.png',
 scale: 2.5,
 framesMax: 8,
 offset: {
    x: 215,
    y: 157
 },
 sprites:   {
    idle: {
        imageSrc: './img/samuraiMack/samuraiMack/Idle.png' ,
        framesMax: 8
     },
    run: {
        imageSrc: './img/samuraiMack/samuraiMack/Run.png' ,
        framesMax: 8
        
    },
    jump: {
        imageSrc: './img/samuraiMack/samuraiMack/Jump.png' ,
        framesMax: 2
        
    },
    fall: {
        imageSrc: './img/samuraiMack/samuraiMack/Fall.png' ,
        framesMax: 2
    },
    attack1: {
        imageSrc: './img/samuraiMack/samuraiMack/Attack1.png' ,
        framesMax: 6
    },
    takeHit: {
        imageSrc: './img/samuraiMack/samuraiMack/Take Hit - white silhouette.png' ,
        framesMax: 4
    },
    death: {
        imageSrc: './img/samuraiMack/samuraiMack/Death.png' ,
        framesMax: 6
    },
 },   
 attackBox: {
    offset: {
        x: 100,
        y: 50
    },
    width: 160,
    height: 50

 },



})




const enemy = new Fighter({
    position: {
    x: 400,
    y: 100
 },
 velocity: {
     x: 0,
     y: 0
 },
 color: 'blue',
 offset: {
    x: -50,
    y: 0
 },
 imageSrc: './img/kenji/kenji/Idle.png',
 scale: 2.5,
 framesMax: 4,
 offset: {
    x: 215,
    y: 167
 },
 sprites:   {
    idle: {
        imageSrc: './img/kenji/kenji/Idle.png' ,
        framesMax: 4
     },
    run: {
        imageSrc: './img/kenji/kenji/Run.png' ,
        framesMax: 8
        
    },
    jump: {
        imageSrc: './img/kenji/kenji/Jump.png' ,
        framesMax: 2
        
    },
    fall: {
        imageSrc: './img/kenji/kenji/Fall.png' ,
        framesMax: 2
    },
    attack1: {
        imageSrc: './img/kenji/kenji/Attack1.png' ,
        framesMax: 4
    },
    takeHit: {
        imageSrc: "./img/kenji/kenji/Take hit.png" ,
        framesMax: 3
    },
    death: {
        imageSrc: './img/kenji/kenji/Death.png' ,
        framesMax: 7
    },
    
 },
 attackBox: {
    offset: {
        x: -170,
        y: 50
    },
    width: 170,
    height: 50

 },
 
})
const playerHealthBar = document.querySelector('#playerHealth')
const enemyHealthBar = document.querySelector('#enemyHealth')

playerHealthBar.setAttribute('aria-valuenow', player.health)
enemyHealthBar.setAttribute('aria-valuenow', enemy.health)

const blockedKeys = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

const keys = {
    a: {
        pressed: false
    },
    d: {
        pressed: false
    },
    w: {
        pressed: false
    },
    ArrowRight: {
        pressed: false
    },
    ArrowLeft: {
        pressed: false
    },
    ArrowUp: {
        pressed: false
    }
}

const isMobileControlsMode = window.matchMedia('(hover: none) and (pointer: coarse)').matches
const mobileLobby = document.querySelector('#mobileLobby')
const mobileControls = document.querySelector('#mobileControls')
const sessionStatus = document.querySelector('#sessionStatus')
const joinP1Button = document.querySelector('#joinP1Button')
const joinP2Button = document.querySelector('#joinP2Button')
const leaveSessionButton = document.querySelector('#leaveSessionButton')
const ROOM_QUERY_PARAM = 'room'
const DEFAULT_ROOM = 'default'
const CLIENT_ID_SESSION_KEY = 'fightingGameClientId'
const SESSION_STATE_KEY_PREFIX = 'fightingGameSessionState:'
const HEARTBEAT_INTERVAL_MS = 2000
const STALE_CLIENT_MS = 7000
const roomUrl = new URL(window.location.href)
const sessionRoom = roomUrl.searchParams.get(ROOM_QUERY_PARAM)?.trim() || DEFAULT_ROOM

if (!roomUrl.searchParams.get(ROOM_QUERY_PARAM)) {
    roomUrl.searchParams.set(ROOM_QUERY_PARAM, sessionRoom)
    window.history.replaceState({}, '', roomUrl.toString())
}

function getClientId() {
    const existingClientId = window.sessionStorage.getItem(CLIENT_ID_SESSION_KEY)

    if (existingClientId) {
        return existingClientId
    }

    const generatedClientId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    window.sessionStorage.setItem(CLIENT_ID_SESSION_KEY, generatedClientId)
    return generatedClientId
}

const clientId = getClientId()
let selectedMobilePlayer = null

function getSessionStorageKey() {
    return `${SESSION_STATE_KEY_PREFIX}${sessionRoom}`
}

function createEmptySessionState() {
    return {
        players: {
            p1: null,
            p2: null
        },
        heartbeats: {}
    }
}

function getSessionState() {
    const rawState = window.localStorage.getItem(getSessionStorageKey())

    if (!rawState) {
        return createEmptySessionState()
    }

    try {
        const parsedState = JSON.parse(rawState)
        return {
            players: {
                p1: parsedState?.players?.p1 || null,
                p2: parsedState?.players?.p2 || null
            },
            heartbeats: parsedState?.heartbeats || {}
        }
    } catch (_error) {
        return createEmptySessionState()
    }
}

function saveSessionState(state) {
    window.localStorage.setItem(getSessionStorageKey(), JSON.stringify(state))
}

function pruneSessionState(state) {
    const now = Date.now()
    const activeHeartbeats = {}

    Object.entries(state.heartbeats || {}).forEach(([id, timestamp]) => {
        if (typeof timestamp === 'number' && now - timestamp <= STALE_CLIENT_MS) {
            activeHeartbeats[id] = timestamp
        }
    })

    const players = {
        p1: state.players?.p1 || null,
        p2: state.players?.p2 || null
    }

    if (players.p1 && !activeHeartbeats[players.p1]) {
        players.p1 = null
    }

    if (players.p2 && !activeHeartbeats[players.p2]) {
        players.p2 = null
    }

    state.heartbeats = activeHeartbeats
    state.players = players
    return state
}

function updateSessionState(updater) {
    const currentState = pruneSessionState(getSessionState())
    updater(currentState)
    saveSessionState(currentState)
    return currentState
}

function describeRoleOwner(roleOwner) {
    if (!roleOwner) {
        return 'Available'
    }

    if (roleOwner === clientId) {
        return 'You'
    }

    return 'Connected'
}

function syncMobileSessionUI() {
    if (!isMobileControlsMode || !mobileControls || !sessionStatus) {
        return
    }

    const state = updateSessionState((sessionState) => {
        if (selectedMobilePlayer && sessionState.players[selectedMobilePlayer] !== clientId) {
            selectedMobilePlayer = null
        }
    })

    const p1Owner = state.players.p1
    const p2Owner = state.players.p2
    const p1TakenByOther = Boolean(p1Owner && p1Owner !== clientId)
    const p2TakenByOther = Boolean(p2Owner && p2Owner !== clientId)
    const p2LockedUntilP1 = !p1Owner

    if (joinP1Button) {
        joinP1Button.disabled = p1TakenByOther
    }

    if (joinP2Button) {
        joinP2Button.disabled = p2TakenByOther || p2LockedUntilP1
    }

    if (leaveSessionButton) {
        leaveSessionButton.disabled = !selectedMobilePlayer
    }

    sessionStatus.textContent = `Room: ${sessionRoom} | Player 1: ${describeRoleOwner(p1Owner)} | Player 2: ${describeRoleOwner(p2Owner)} | Selected: ${selectedMobilePlayer || 'None'}`

    mobileControls.dataset.selectedPlayer = selectedMobilePlayer || ''
    mobileControls.classList.toggle('is-visible', Boolean(selectedMobilePlayer))
}

function claimMobileRole(role) {
    updateSessionState((state) => {
        const roleOwner = state.players[role]

        if (roleOwner && roleOwner !== clientId) {
            return
        }

        if (role === 'p2' && !state.players.p1) {
            return
        }

        const oppositeRole = role === 'p1' ? 'p2' : 'p1'
        if (state.players[oppositeRole] === clientId) {
            state.players[oppositeRole] = null
        }

        state.players[role] = clientId
        state.heartbeats[clientId] = Date.now()
        selectedMobilePlayer = role
    })

    syncMobileSessionUI()
}

function leaveMobileRole() {
    updateSessionState((state) => {
        if (state.players.p1 === clientId) {
            state.players.p1 = null
        }

        if (state.players.p2 === clientId) {
            state.players.p2 = null
        }
    })

    keys.a.pressed = false
    keys.d.pressed = false
    keys.ArrowLeft.pressed = false
    keys.ArrowRight.pressed = false

    selectedMobilePlayer = null
    syncMobileSessionUI()
}

function sendMobileHeartbeat() {
    if (!selectedMobilePlayer) {
        return
    }

    updateSessionState((state) => {
        state.heartbeats[clientId] = Date.now()
    })
}

function canUseMobileControl(control) {
    if (!isMobileControlsMode) {
        return true
    }

    if (!selectedMobilePlayer) {
        return false
    }

    const controlRole = control.startsWith('p1-') ? 'p1' : 'p2'
    return controlRole === selectedMobilePlayer
}

function handleControlPress(control) {
    switch (control) {
        case 'p1-left':
            if (!player.dead) {
                keys.a.pressed = true
                player.lastKey = 'a'
            }
            break
        case 'p1-right':
            if (!player.dead) {
                keys.d.pressed = true
                player.lastKey = 'd'
            }
            break
        case 'p1-jump':
            if (!player.dead) {
                player.velocity.y = -20
            }
            break
        case 'p1-attack':
            if (!player.dead) {
                player.attack()
            }
            break
        case 'p2-left':
            if (!enemy.dead) {
                keys.ArrowLeft.pressed = true
                enemy.lastKey = 'ArrowLeft'
            }
            break
        case 'p2-right':
            if (!enemy.dead) {
                keys.ArrowRight.pressed = true
                enemy.lastKey = 'ArrowRight'
            }
            break
        case 'p2-jump':
            if (!enemy.dead) {
                enemy.velocity.y = -20
            }
            break
        case 'p2-attack':
            if (!enemy.dead) {
                enemy.attack()
            }
            break
    }
}

function handleControlRelease(control) {
    switch (control) {
        case 'p1-left':
            keys.a.pressed = false
            break
        case 'p1-right':
            keys.d.pressed = false
            break
        case 'p2-left':
            keys.ArrowLeft.pressed = false
            break
        case 'p2-right':
            keys.ArrowRight.pressed = false
            break
    }
}

decreaseTimer()

 function animate() {
    window.requestAnimationFrame(animate)
    c.fillStyle = 'black'
    c.fillRect(0,0, canvas.width, canvas.height)
    background.update()
    shop.update()
    c.fillStyle = 'rgba(255, 255, 255, 0.15)'
    c.fillRect(0,0,canvas.width,canvas.height)
    player.update()
    enemy.update()

    player.velocity.x = 0
    enemy.velocity.x = 0

    // player movement
    
    if (keys.a.pressed && player.lastKey === 'a') {
        player.velocity.x = -5 
        player.switchSprite('run')    
    } else if (keys.d.pressed && player.lastKey === 'd') {
        player.velocity.x = 5
        player.switchSprite('run')
    } else {
        player.switchSprite('idle')
    }


    // jumping
    if (player.velocity.y < 0) {
        player.switchSprite('jump')
    } else if (player.velocity.y > 0) {
        player.switchSprite('fall')
    } 

    // enemy movement
    if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
        enemy.velocity.x = -5
        enemy.switchSprite('run')
    } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
        enemy.velocity.x = 5
        enemy.switchSprite('run')
    } else {
        enemy.switchSprite('idle')
    }

     // jumping
    if (enemy.velocity.y < 0) {
        enemy.switchSprite('jump')
    } else if (enemy.velocity.y > 0) {
        enemy.switchSprite('fall')
    } 

    // detect for collision & enemy gets hit
    if (
        rectangularCollision({
            rectangle1: player ,
            rectangle2: enemy
        }) &&
        player.isAttacking && 
        player.framesCurrent === 4 
        ) {
        enemy.takeHit()
        player.isAttacking = false
        //put line below directly in takeHit
        //enemy.health -= 20
        //document.querySelector('#enemyHealth').style.width = enemy.health + '%'
        // animation for health decrease
        gsap.to('#enemyHealth', {
            width: enemy.health + '%'
        })
        enemyHealthBar.setAttribute('aria-valuenow', enemy.health)
    }

    //if player misses
    if (player.isAttacking && player.framesCurrent === 4){
        // so that u dont decrease enemy health when not attacking
        player.isAttacking = false
    }

    // player gets hit
    if (
        rectangularCollision({
            rectangle1: enemy ,
            rectangle2: player
        }) &&
        enemy.isAttacking && // so that u only minus health when attack ends
        enemy.framesCurrent === 2
        ) {
            player.takeHit()
            enemy.isAttacking = false
            //player.health -= 20
            //document.querySelector('#playerHealth').style.width = player.health + '%'
            // animation for health decrease
            gsap.to('#playerHealth', {
                width: player.health + '%'
            })
            playerHealthBar.setAttribute('aria-valuenow', player.health)
    }

    //if enemy misses
    if (enemy.isAttacking && enemy.framesCurrent === 2){
        // so that u dont decrease enemy health when not attacking
        enemy.isAttacking = false
    }

    // end game based on health
    if (enemy.health <= 0 || player.health <= 0){
        determineWinner({player,enemy,timerId})
    }

 }

animate()

function handleKeyboardPress(key) {
   switch (key) {
       case 'd':
           handleControlPress('p1-right')
           break
       case 'a':
           handleControlPress('p1-left')
           break
       case 'w':
           handleControlPress('p1-jump')
           break
       case ' ':
           handleControlPress('p1-attack')
           break
       case 'ArrowRight':
           handleControlPress('p2-right')
           break
       case 'ArrowLeft':
           handleControlPress('p2-left')
           break
       case 'ArrowUp':
           handleControlPress('p2-jump')
           break
       case 'ArrowDown':
           handleControlPress('p2-attack')
           break
   }
}

function handleKeyboardRelease(key) {
   switch (key) {
       case 'd':
           handleControlRelease('p1-right')
           break
       case 'a':
           handleControlRelease('p1-left')
           break
       case 'ArrowRight':
           handleControlRelease('p2-right')
           break
       case 'ArrowLeft':
           handleControlRelease('p2-left')
           break
   }
}

window.addEventListener('keydown', (event) => {
   if (blockedKeys.has(event.key)) {
       event.preventDefault()
   }
   handleKeyboardPress(event.key)
})


window.addEventListener('keyup', (event) => {
   if (blockedKeys.has(event.key)) {
       event.preventDefault()
   }
   handleKeyboardRelease(event.key)
})

const mobileControlButtons = document.querySelectorAll('[data-control]')

mobileControlButtons.forEach((button) => {
   const control = button.dataset.control
   const releaseControl = (event) => {
       event.preventDefault()
       if (!canUseMobileControl(control)) {
           return
       }
       handleControlRelease(control)
   }

   button.addEventListener('pointerdown', (event) => {
       event.preventDefault()
       if (!canUseMobileControl(control)) {
           return
       }
       handleControlPress(control)
   })
   button.addEventListener('pointerup', releaseControl)
   button.addEventListener('pointercancel', releaseControl)
   button.addEventListener('pointerleave', releaseControl)
})

if (isMobileControlsMode && mobileLobby) {
   if (joinP1Button) {
       joinP1Button.addEventListener('click', () => {
           claimMobileRole('p1')
       })
   }

   if (joinP2Button) {
       joinP2Button.addEventListener('click', () => {
           claimMobileRole('p2')
       })
   }

   if (leaveSessionButton) {
       leaveSessionButton.addEventListener('click', () => {
           leaveMobileRole()
       })
   }

   window.addEventListener('storage', (event) => {
       if (event.key === getSessionStorageKey()) {
           syncMobileSessionUI()
       }
   })

   window.addEventListener('beforeunload', () => {
       leaveMobileRole()
   })

   window.setInterval(() => {
       sendMobileHeartbeat()
       syncMobileSessionUI()
   }, HEARTBEAT_INTERVAL_MS)

   syncMobileSessionUI()
}