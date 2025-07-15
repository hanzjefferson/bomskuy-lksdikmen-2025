// ==== STATE GLOBAL ====
const gameStats = {
    player: null,
    time: 0,
    life: 3,
    walls: 0,
    tnt: 0,
    freeze: 0,
};

let isPaused = false;
let statsListener = null;
let gameContainer = null;

const gameMap = [
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
];

const gameObjects = [];

// ==== GAME CONTROL ====
function initGame(container) {
    gameContainer = container;
    window.addEventListener("resize", render);
}

function setStats(key, val) {
    gameStats[key] = val;
    if (statsListener) statsListener();
}

function incStats(key) {
    gameStats[key]++;
    if (statsListener) statsListener();
}

function decStats(key) {
    gameStats[key]--;
    if (statsListener) statsListener();
}

function attach(gameObject) {
    if (!gameContainer) throw new Error("gameContainer not set!");

    for (let i = 0; i < gameObjects.length; i++) {
        if (gameObjects[i] === null) {
            gameObjects[i] = gameObject;
            gameContainer.append(gameObject.element);
            return i + 1;
        }
    }

    gameObjects.push(gameObject);
    gameContainer.append(gameObject.element);
    return gameObjects.length;
}

function dettach(label) {
    const gameObject = gameObjects[label - 1];
    if (!gameObject) return;

    if (gameObject.solid && gameObject.position) {
        const [x, y] = gameObject.position;
        gameMap[y][x] = 0;
    }

    if (gameObject.element && gameContainer.contains(gameObject.element)) {
        gameContainer.removeChild(gameObject.element);
    }
    gameObjects[label - 1] = null;
}

function getObject(label) {
    return gameObjects[label - 1];
}

function getObjectFromPosition(x, y) {
    const label = gameMap[y][x];
    return label > 0 ? getObject(label) : null;
}

function render() {
    if (!gameContainer) return;
    const stepX = gameContainer.clientWidth / 11;
    const stepY = gameContainer.clientHeight / 9;

    for (const gameObject of gameObjects) {
        if (!gameObject || !gameObject.position) continue;
        const el = gameObject.element;

        const elWidth = el.clientWidth;
        const elHeight = el.clientHeight;

        el.style.left = `${
            gameObject.position[0] * stepX + (stepX - elWidth) / 2
        }px`;
        el.style.top = `${
            gameObject.position[1] * stepY + (stepY - elHeight) / 2
        }px`;
    }
}

// ==== GAME OBJECTS ====
class GameObject {
    constructor() {
        this.element = document.createElement("img");
        this.element.onload = () => render();
        this.label = attach(this);
        this.position = null;
        this.solid = false;
    }

    setPosition(x, y) {
        if (this.solid) {
            if (gameMap[y][x] !== 0) return;

            if (this.position) gameMap[this.position[1]][this.position[0]] = 0;
            gameMap[y][x] = this.label;
        }
        this.position = [x, y];
        render();
    }

    getPosition() {
        if (!this.position) throw new Error("Position is not set!");
        return this.position;
    }

    destroy() {
        dettach(this.label);
    }
}

class ControlledMovement extends GameObject {
    constructor() {
        super();
        this.canMove = true;
        document.addEventListener("keydown", (e) => {
            if (isPaused) return;
            if (!this.canMove) return;
            if (e.key.toLowerCase() == "w" || e.key == "ArrowUp")
                this.moveY(-1);
            if (e.key.toLowerCase() == "s" || e.key == "ArrowDown")
                this.moveY(1);
            if (e.key.toLowerCase() == "a" || e.key == "ArrowLeft")
                this.moveX(-1);
            if (e.key.toLowerCase() == "d" || e.key == "ArrowRight")
                this.moveX(1);
        });
    }

    moveX(axis) {
        this.setPosition(this.position[0] + axis, this.position[1]);
    }

    moveY(axis) {
        this.setPosition(this.position[0], this.position[1] + axis);
    }
}

class Player extends ControlledMovement {
    constructor() {
        super();
        this.solid = true;
        this.dir = "down";
        this.element.src = "assets/char_down.png";

        document.addEventListener("keydown", (e) => {
            if (isPaused) return;
            if (e.key == " ") this.placeBomb();
        });
        this.canPlace = true;
    }

    moveX(axis) {
        if (axis < 0) {
            if (this.dir !== "left") {
                this.element.src = "assets/char_left.png";
                this.dir = "left";
            } else super.moveX(axis);
        }
        if (axis > 0) {
            if (this.dir !== "right") {
                this.element.src = "assets/char_right.png";
                this.dir = "right";
            } else super.moveX(axis);
        }
    }

    moveY(axis) {
        if (axis > 0) {
            if (this.dir !== "down") {
                this.element.src = "assets/char_down.png";
                this.dir = "down";
            } else super.moveY(axis);
        }
        if (axis < 0) {
            if (this.dir !== "up") {
                this.element.src = "assets/char_up.png";
                this.dir = "up";
            } else super.moveY(axis);
        }
    }

    placeBomb() {
        if (!this.canPlace) return;
        let [x, y] = this.position;
        switch (this.dir) {
            case "left":
                x--;
                break;
            case "right":
                x++;
                break;
            case "up":
                y--;
                break;
            case "down":
                y++;
                break;
        }
        if (gameMap[y][x] !== 0) return;
        new Bomb(x, y);
        this.canPlace = false;
        setTimeout(() => (this.canPlace = true), 2000);
    }

    setPosition(x, y) {
        for (const gameObject of gameObjects) {
            if (
                gameObject?.position != null &&
                gameObject.position[0] == x &&
                gameObject.position[1] == y
            ) {
                if (gameObject instanceof Item) gameObject.pick(this);
                break;
            }
        }
        super.setPosition(x, y);
    }
}

class Bomb extends GameObject {
    constructor(x, y) {
        super();
        this.solid = true;
        this.element.src = "assets/bomb.png";
        this.setPosition(x, y);

        this.explodeTime = Date.now() + (1500+(200*gameStats['tnt']));
        this.checkInterval = setInterval(() => {
            if (isPaused) return;
            if (Date.now() >= this.explodeTime) {
                clearInterval(this.checkInterval);
                this.explode();
            }
        }, 100);
    }

    explode() {
        const [x, y] = this.position;
        new Explosion().setPosition(x, y);

        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];

        for (const [dx, dy] of directions) {
            for (let i = 1; i <= gameStats["tnt"] + 1; i++) {
                const tx = x + dx * i;
                const ty = y + dy * i;

                if (
                    tx < 0 ||
                    tx >= gameMap[0].length ||
                    ty < 0 ||
                    ty >= gameMap.length
                )
                    break;

                const objLabel = gameMap[ty][tx];
                if (objLabel === this.label) continue;
                if (objLabel >= 0) new Explosion().setPosition(tx, ty);
                if (objLabel < 0 || objLabel > 0) break;
            }
        }
    }
}

class Explosion extends GameObject {
    constructor() {
        super();
        this.element.style.zIndex = "99";
        this.element.src = "assets/explosion.png";
    }

    setPosition(x, y) {
        for (const gameObject of gameObjects) {
            if (
                gameObject?.position != null &&
                gameObject.position[0] == x &&
                gameObject.position[1] == y
            ) {
                if (gameObject instanceof Player) decStats("life");
                else if (!(gameObject instanceof Dog)) gameObject.destroy();
            }
        }
        super.setPosition(x, y);
        setTimeout(() => this.destroy(), 1000);
    }
}

class Brick extends GameObject {
    constructor() {
        super();
        this.solid = true;
        this.element.src = "assets/wall.png";
    }

    destroy() {
        super.destroy();
        incStats("walls");
        const randItem = Math.round(Math.random() * 3);
        switch (randItem) {
            case 0:
                new TNT().setPosition(this.position[0], this.position[1]);
                break;
            case 1:
                new BrokenHeart().setPosition(
                    this.position[0],
                    this.position[1]
                );
                break;
            case 2:
                new IceCube().setPosition(this.position[0], this.position[1]);
                break;
        }
    }
}

class Dog extends GameObject {
    constructor(player) {
        super();
        this.solid = true;
        this.element.src = "assets/dog_down.png";
        this.player = player;

        this.currentPath = [];
        this.currentStep = 0;
        this.chasing = false;
        this.chaseInterval = null;
    }

    startChasing() {
        if (this.chasing) return;
        this.chasing = true;

        this.chaseInterval = setInterval(() => {
            if (!isPaused) {
                this.recalculatePath();
                this.moveOneStep();
            } else {
                this.currentPath = [];
                this.currentStep = 0;
            }
        }, 1000-(35*gameStats['walls']));
    }

    stopChasing() {
        if (this.chaseInterval) clearInterval(this.chaseInterval);
        this.chasing = false;
    }

    recalculatePath() {
        const mapCopy = JSON.parse(JSON.stringify(gameMap));
        mapCopy[this.position[1]][this.position[0]] = 0;
        mapCopy[this.player.position[1]][this.player.position[0]] = 0;

        const newPath = astar(this.position, this.player.position, mapCopy);
        if (newPath && newPath.length > 1) {
            this.currentPath = newPath.slice(1);
            this.currentStep = 0;
        } else {
            this.currentPath = [];
        }
    }

    moveOneStep() {
        if (this.currentStep >= this.currentPath.length) return;
        const [x, y] = this.currentPath[this.currentStep];
        this.setDirectionSprite(this.position, [x, y]);
        this.setPosition(x, y);
        this.currentStep++;
        if (x === this.player.position[0] && y === this.player.position[1]) {
            decStats("life");
            this.currentPath = [];
            this.currentStep = 0;
        }
    }

    setDirectionSprite(from, to) {
        const [fx, fy] = from;
        const [tx, ty] = to;
        if (tx > fx) this.element.src = "assets/dog_right.png";
        else if (tx < fx) this.element.src = "assets/dog_left.png";
        else if (ty > fy) this.element.src = "assets/dog_down.png";
        else if (ty < fy) this.element.src = "assets/dog_up.png";
    }

    destroy() {
        this.stopChasing();
        super.destroy();
    }
}

class Item extends GameObject {
    constructor() {
        super();
        this.element.className = "item";
        this.solid = false;
    }

    pick(player) {
        this.element.classList.add("taken");
        setTimeout(() => {
            this.destroy();
        }, 500);
    }
}

class TNT extends Item {
    constructor() {
        super();
        this.element.src = "assets/tnt.png";
    }

    pick(player) {
        super.pick();
        incStats("tnt");
    }
}

class BrokenHeart extends Item {
    constructor() {
        super();
        this.element.src = "assets/heart.png";
    }

    pick(player) {
        super.pick();
        decStats("life");
    }
}

class IceCube extends Item {
    constructor() {
        super();
        this.element.src = "assets/ice.png";
    }

    pick(player) {
        super.pick();
        incStats("freeze");
        player.element.style.filter =
            "sepia(1) hue-rotate(180deg) saturate(4) brightness(0.95) contrast(1.1)";
        player.canMove = false;
        setTimeout(() => {
            player.element.style.filter = null;
            player.canMove = true;
        }, 1000);
    }
}

// ==== UTILS ====
function astar(start, goal, grid) {
    function MinHeap() {
        const heap = [];
        const swap = (i, j) => ([heap[i], heap[j]] = [heap[j], heap[i]]);
        const bubbleUp = (i) => {
            while (i > 0) {
                const p = Math.floor((i - 1) / 2);
                if (heap[i].f >= heap[p].f) break;
                swap(i, p);
                i = p;
            }
        };
        const bubbleDown = (i) => {
            const n = heap.length;
            while (true) {
                let l = 2 * i + 1,
                    r = 2 * i + 2,
                    s = i;
                if (l < n && heap[l].f < heap[s].f) s = l;
                if (r < n && heap[r].f < heap[s].f) s = r;
                if (s === i) break;
                swap(i, s);
                i = s;
            }
        };
        return {
            push(node) {
                heap.push(node);
                bubbleUp(heap.length - 1);
            },
            pop() {
                if (!heap.length) return null;
                const top = heap[0],
                    end = heap.pop();
                if (heap.length) {
                    heap[0] = end;
                    bubbleDown(0);
                }
                return top;
            },
            isEmpty() {
                return !heap.length;
            },
        };
    }

    const heuristic = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    const getNeighbors = ([x, y]) =>
        [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
        ]
            .map(([dx, dy]) => [x + dx, y + dy])
            .filter(
                ([nx, ny]) =>
                    ny >= 0 &&
                    ny < grid.length &&
                    nx >= 0 &&
                    nx < grid[0].length &&
                    grid[ny][nx] === 0
            );

    function Node(position, parent, g, h) {
        return { position, parent, g, h, f: g + h };
    }

    const open = MinHeap();
    const closed = new Set();
    const gScores = new Map();
    const startNode = Node(start, null, 0, heuristic(start, goal));
    open.push(startNode);
    gScores.set(start.toString(), 0);

    while (!open.isEmpty()) {
        const current = open.pop();
        if (current.position[0] === goal[0] && current.position[1] === goal[1])
            return reconstruct(current);
        closed.add(current.position.toString());
        for (const nPos of getNeighbors(current.position)) {
            if (closed.has(nPos.toString())) continue;
            const tG = current.g + 1;
            const key = nPos.toString();
            const prevG = gScores.get(key);
            if (prevG === undefined || tG < prevG) {
                gScores.set(key, tG);
                open.push(Node(nPos, current, tG, heuristic(nPos, goal)));
            }
        }
    }
    return null;

    function reconstruct(node) {
        const path = [];
        while (node) {
            path.push(node.position);
            node = node.parent;
        }
        return path.reverse();
    }
}

function inRadius(posA, posB, radius = 1) {
    return Math.abs(posA[0] - posB[0]) + Math.abs(posA[1] - posB[1]) <= radius;
}

function randomPosition() {
    return [
        Math.round(Math.random() * 8) + 1,
        Math.round(Math.random() * 6) + 1,
    ];
}

function ranPosUntilValid(player) {
    let pos = randomPosition();
    while (gameMap[pos[1]][pos[0]] != 0 || inRadius(player.position, pos, 2)) {
        pos = randomPosition();
    }
    return pos;
}

function inRadius(posA, posB, radius = 1) {
    const [ax, ay] = posA;
    const [bx, by] = posB;
    return Math.abs(ax - bx) + Math.abs(ay - by) <= radius;
}
