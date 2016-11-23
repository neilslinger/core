'use strict';

var paintCellsByColumnsAndRows = require('./by-columns-and-rows');

/** @summary Render the grid only as needed ("partial render").
 * @desc Paints all the cells of a grid, one column at a time, but only as needed.
 *
 * Paints all the cells of a grid, one row at a time.
 *
 * #### On reset
 *
 * Defers to {@link Renderer#paintCellsByColumnsAndRows|paintCellsByColumnsAndRows}, which clears the canvas, draws the grid, and draws the grid lines.
 *
 * #### On the next call (afer reset)
 *
 * First, a background rect is drawn using the grid background color.
 *
 * Then, each cell is drawn. If its background differs from the grid background, the background is repainted.
 *
 * `try...catch` surrounds each cell paint in case a cell renderer throws an error.
 * The error message is error-logged to console AND displayed in cell.
 *
 * #### On subsequent calls
 *
 * Iterates through each cell, calling `_paintCell` with `undefined` prefill color. This signifies partial render to the {@link SimpleCell} cell renderer, which only renders the cell when it's text, font, or colors have changed.
 *
 * Each cell to be rendered is described by a {@link CellEvent} object. For performance reasons, to avoid constantly instantiating these objects, we maintain a pool of these. When the grid shape changes, we reset their coordinates by setting {@link CellEvent#reset|reset} on each.
 *
 * See also the discussion of clipping in {@link Renderer#paintCellsByColumns|paintCellsByColumns}.
 * @this {Renderer}
 * @param {CanvasRenderingContext2D} gc
 * @memberOf Renderer.prototype
 */
function paintCells(gc) {
    var grid = this.grid,
        gridProps = grid.properties,
        cellEvent,
        vc, visibleColumns = this.visibleColumns,
        visibleRows = this.visibleRows,
        c, C = visibleColumns.length, c0 = gridProps.showRowNumbers ? -1 : 0, cLast = C - 1,
        r, R = visibleRows.length,
        p, pool = this.cellEventPool,
        preferredWidth,
        columnClip,
        // clipToGrid,
        // viewWidth = C ? visibleColumns[cLast].right : 0,
        viewHeight = R ? visibleRows[R - 1].bottom : 0;

    if (paintCells.reset) {
        this.resetAllGridRenderers();
        paintCellsByColumnsAndRows.call(this, gc);
        paintCells.reset = false;
    }

    // gc.clipSave(clipToGrid, 0, 0, viewWidth, viewHeight);

    // For each column...
    for (p = 0, c = c0; c < C; c++) {
        cellEvent = pool[p]; // first cell in column c
        this._cellOwnProperties = undefined;
        vc = cellEvent.visibleColumn;

        // Optionally clip to visible portion of column to prevent text from overflowing to right.
        columnClip = vc.column.properties.columnClip;
        gc.clipSave(columnClip || columnClip === null && c === cLast, 0, 0, vc.right, viewHeight);

        // For each row of each subgrid (of each column)...
        for (preferredWidth = r = 0; r < R; r++, p++) {
            cellEvent = pool[p]; // next cell down the column (redundant for first cell in column)
            this._cellOwnProperties = undefined;

            try {
                preferredWidth = Math.max(preferredWidth, this._paintCell(gc, pool[p]));
            } catch (e) {
                this.renderErrorCell(e, gc, vc, pool[p].visibleRow);
            }
        }

        gc.clipRestore(columnClip);

        cellEvent.column.properties.preferredWidth = Math.round(preferredWidth);
    }

    // gc.clipRestore(clipToGrid);
}

paintCells.key = 'by-cells';

module.exports = paintCells;
