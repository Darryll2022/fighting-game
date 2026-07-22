function rectangularCollision({rectangle1, rectangle2}) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x && 
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    )
}

function determineWinner({player, enemy,timerId}) {
    clearTimeout(timerId)
    document.querySelector('#displayText').style.display = 'flex'
    const displayText = document.querySelector('#displayText')
    if (player.health === enemy.health) {
        displayText.textContent = 'Tie'
      }  else if (player.health > enemy.health) {
        displayText.textContent = 'Player 1 Wins'
      } else if (player.health < enemy.health) {
        displayText.textContent = 'Player 2 Wins'
      }
}

let timer = 100
let timerId 
function decreaseTimer() {
    const timerElement = document.querySelector('#timer')
    if (timer > 0) {
    timerId = setTimeout(decreaseTimer,1000)
    timer--
    timerElement.textContent = timer
    timerElement.setAttribute('aria-valuenow', timer)
    } 
      if (timer === 0) {  
        determineWinner({player, enemy, timerId})
    }
}