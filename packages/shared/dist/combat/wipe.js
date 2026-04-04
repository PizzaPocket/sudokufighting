export function wipeRow(puzz, row) {
    for (let c = 0; c < 9; c++) {
        puzz.playerGrid[row][c] = null;
    }
}
export function wipeCol(puzz, col) {
    for (let r = 0; r < 9; r++) {
        puzz.playerGrid[r][col] = null;
    }
}
export function wipeBox(puzz, boxRow, boxCol) {
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            puzz.playerGrid[r][c] = null;
        }
    }
}
