// initialization
document.addEventListener("DOMContentLoaded", () => {

    // Set current year
    document.getElementById("current-year").textContent =
        new Date().getFullYear();

    // Dark mood    
    const darkModeToggle = document.getElementById("darkModeToggle");
    const body = document.body;

    const updateIcons = (isDark) => {
        darkModeToggle.querySelector(".fa-sun").style.display = isDark ? "none" : "block";
        darkModeToggle.querySelector(".fa-moon").style.display = isDark ? "block" : "none";
    };

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedMode = localStorage.getItem("darkMode");
    const initialDark = savedMode === "enabled" || (!savedMode && prefersDark);

    if (initialDark) body.classList.add("dark-mode");
    updateIcons(initialDark);

    darkModeToggle.addEventListener("click", () => {
        const isDark = body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
        updateIcons(isDark);
    });

    // Game Logic
    const cells = document.querySelectorAll(".cell");
    const status = document.getElementById("status");
    const resetBtn = document.getElementById("reset");

    let currentPlayer = "X";
    let gameActive = true;
    let board = ["", "", "", "", "", "", "", "", ""];

    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    function handleCellClick(e) {
        const clickedCell = e.target;
        const index = parseInt(clickedCell.getAttribute("data-cell"));

        if (board[index] !== "" || !gameActive) return;

        board[index] = currentPlayer;
        clickedCell.textContent = currentPlayer;
        clickedCell.classList.add(`player-${currentPlayer}`);
        checkResult();
    }

    function checkResult() {
        let roundWon = false;

        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                roundWon = true;
                // Highlight winning cells
                [a, b, c].forEach(i =>
                document.querySelector(`.cell[data-cell="${i}"]`).classList.add("winning-cell")
                );
                break;
            }
        }

        if (roundWon) {
            status.innerHTML = `<i class="fas fa-trophy status-icon"></i><span class="status-text">  Player ${currentPlayer} Wins!</span>`;
            gameActive = false;
            return;
        }

        if (!board.includes("")) {
            status.innerHTML = `<i class="fas fa-handshake status-icon"></i><span class="status-text">  Game Draw!</span>`;
            gameActive = false;
            return;
        }

        currentPlayer = currentPlayer === "X" ? "O" : "X";
        status.innerHTML = `<i class="fas fa-circle status-icon"></i><span class="status-text">  Player ${currentPlayer}'s Turn</span>`;
    }

    function resetGame() {
        currentPlayer = "X";
        gameActive = true;
        board = ["", "", "", "", "", "", "", "", ""];
        status.innerHTML = `<i class="fas fa-circle status-icon"></i><span class="status-text">  Player ${currentPlayer}'s Turn</span>`;

        cells.forEach(cell => {
        cell.textContent = "";
        cell.className = "cell";
        });
    }

    cells.forEach(cell => cell.addEventListener("click", handleCellClick));
    resetBtn.addEventListener("click", resetGame);

    // Scroll to Top
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");
    window.addEventListener("scroll", () => {
        scrollToTopBtn.classList.toggle("visible", window.scrollY > 300);
    });
    scrollToTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Project Gallery
    document.querySelectorAll(".clickableImage").forEach((img) => {
        img.addEventListener("click", function () {
            const images = JSON.parse(this.dataset.images);
            const indicators = document.getElementById("carouselIndicators");
            const inner = document.getElementById("carouselInner");
            const prev = document.querySelector("#dynamicCarousel .carousel-control-prev");
            const next = document.querySelector("#dynamicCarousel .carousel-control-next");

            indicators.innerHTML = inner.innerHTML = "";

            images.forEach((src, i) => {
                if (images.length > 1) {
                    const indicator = document.createElement("button");
                    indicator.type = "button";
                    indicator.dataset.bsTarget = "#dynamicCarousel";
                    indicator.dataset.bsSlideTo = i;
                    indicator.className = i === 0 ? "active" : "";
                    if (i === 0) indicator.setAttribute("aria-current", "true");
                    indicators.appendChild(indicator);
                }

                const item = document.createElement("div");
                item.className = `carousel-item ${i === 0 ? "active" : ""}`;
                item.innerHTML = `<img src="${src}" class="d-block w-100">`;
                inner.appendChild(item);
            });

            // Hide arrows if only one image
            if (images.length <= 1) {
                prev.style.display = "none";
                next.style.display = "none";
            } else {
                prev.style.display = "flex"; // or "block" depending on your CSS
                next.style.display = "flex";
            }
        });
    });

});
