/*!
 * 🎯 統合台帳システムv2 - セル選択・キーボード操作
 * @description セル選択・キーボードナビゲーション・矢印キー操作専用モジュール
 * @version 2.0.0
 * @created 2024-12
 * 
 * ✅ **責任範囲**
 * ✅ セル選択状態管理（単一選択・複数選択）
 * ✅ 矢印キーナビゲーション（上下左右）
 * ✅ キーボードショートカット（Ctrl+C/V/X、Delete）
 * ✅ セル選択ハイライト制御
 * ✅ セル範囲選択（Shift+矢印キー）
 * 
 * ❌ **やってはいけないこと（責任範囲外）**
 * ❌ セル編集・インライン編集（inline-edit.jsの責任）
 * ❌ セル交換・ドラッグ&ドロップ（cell-swap.jsの責任）
 * ❌ イベント統合管理（table-events.jsの責任）
 * ❌ テーブル描画・DOM構築（table-render.jsの責任）
 * ❌ スタイル定義（table-interaction.cssの責任）
 * 
 * 🎯 **管理対象操作**
 * - 単一セル選択（クリック・キーボード移動）
 * - 複数セル選択（Shift+クリック・Shift+矢印）
 * - 矢印キーナビゲーション（↑↓←→）
 * - キーボードショートカット（Ctrl+各種）
 * 
 * 📦 **含まれるクラス**
 * - CellSelectionManager: セル選択・キーボード操作管理クラス
 * 
 * 🔗 **依存関係**
 * - window.fieldsConfig (フィールド設定 - config.js)
 * - クリップボードAPI（コピー&ペースト用）
 * 
 * 💡 **使用例**
 * ```javascript
 * // セル選択
 * cellSelectionManager.selectCell(cell);
 * 
 * // 範囲選択
 * cellSelectionManager.selectRange(startCell, endCell);
 * ```
 * 
 * 🎨 **視覚的フィードバック**
 * - 単一選択: 青色境界線 + 薄い青背景
 * - 範囲選択: 選択範囲全体に薄い青背景
 * - フォーカス: 太い青境界線（現在のアクティブセル）
 * 
 * ⌨️ **キーボードショートカット**
 * - ↑↓←→: セル移動
 * - Shift+↑↓←→: 範囲選択
 * - Ctrl+C: コピー
 * - Ctrl+V: ペースト
 * - Ctrl+X: カット
 * - Delete: 削除
 * - Tab: 次のセルへ
 * - Shift+Tab: 前のセルへ
 */
(function() {
    'use strict';

    // グローバル名前空間確保
    window.LedgerV2 = window.LedgerV2 || {};
    window.LedgerV2.TableInteract = window.LedgerV2.TableInteract || {};

    // =============================================================================
    // 🎯 セル選択・キーボード操作管理
    // =============================================================================

    class CellSelectionManager {
        constructor() {
            // 選択状態管理
            this.selectedCell = null;
            this.selectedRange = {
                start: null,
                end: null,
                cells: [] // 選択範囲内のセル配列
            };
            this.isRangeSelecting = false;
            
            // クリップボード管理
            this.clipboard = null;
        }



        /**
         * 矢印キー判定
         */
        _isArrowKey(key) {
            return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
        }



        /**
         * 矢印キー処理
         */
        _handleArrowKey(event) {
            const currentCell = this.selectedCell;
            const targetCell = this._getAdjacentCell(currentCell, event.key);
            
            if (!targetCell) {
                return;
            }

            if (event.shiftKey) {
                // Shift+矢印キー: 範囲選択
                this._expandSelection(targetCell);
            } else {
                // 矢印キーのみ: 単一セル移動
                this.selectCell(targetCell);
                this._clearRangeSelection();
            }
        }

        /**
         * 隣接セルを取得
         */
        _getAdjacentCell(currentCell, direction) {
            const row = currentCell.closest('tr');
            const table = currentCell.closest('table');
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            const cells = Array.from(row.querySelectorAll('td[data-field-code]'));
            
            const currentRowIndex = rows.indexOf(row);
            const currentCellIndex = cells.indexOf(currentCell);

            switch (direction) {
                case 'ArrowUp':
                    if (currentRowIndex > 0) {
                        const prevRow = rows[currentRowIndex - 1];
                        const prevRowCells = Array.from(prevRow.querySelectorAll('td[data-field-code]'));
                        return prevRowCells[currentCellIndex] || null;
                    }
                    break;
                    
                case 'ArrowDown':
                    if (currentRowIndex < rows.length - 1) {
                        const nextRow = rows[currentRowIndex + 1];
                        const nextRowCells = Array.from(nextRow.querySelectorAll('td[data-field-code]'));
                        return nextRowCells[currentCellIndex] || null;
                    }
                    break;
                    
                case 'ArrowLeft':
                    if (currentCellIndex > 0) {
                        return cells[currentCellIndex - 1];
                    }
                    break;
                    
                case 'ArrowRight':
                    if (currentCellIndex < cells.length - 1) {
                        return cells[currentCellIndex + 1];
                    }
                    break;
            }
            
            return null;
        }

        /**
         * セル選択
         */
        selectCell(cell) {
            // 前の選択を解除
            this._clearCellSelection();
            
            // 新しいセルを選択
            this.selectedCell = cell;
            if (cell) {
                cell.classList.add('cell-selected');
                cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        }

        /**
         * セル選択をクリア
         */
        _clearCellSelection() {
            if (this.selectedCell) {
                this.selectedCell.classList.remove('cell-selected');
                this.selectedCell = null;
            }
        }

        /**
         * 範囲選択を拡張
         */
        _expandSelection(targetCell) {
            if (!this.selectedRange.start) {
                // 範囲選択開始
                this.selectedRange.start = this.selectedCell;
            }
            
            this.selectedRange.end = targetCell;
            this._updateRangeSelection();
            
            // アクティブセルを移動
            this.selectCell(targetCell);
        }

        /**
         * 範囲選択を更新
         */
        _updateRangeSelection() {
            // 前の範囲選択をクリア
            this._clearRangeSelection();
            
            if (!this.selectedRange.start || !this.selectedRange.end) {
                return;
            }

            // 範囲内のセルを計算
            const rangeCells = this._calculateRangeCells(this.selectedRange.start, this.selectedRange.end);
            
            // 範囲選択クラスを適用
            rangeCells.forEach(cell => {
                cell.classList.add('cell-range-selected');
            });
            
            this.selectedRange.cells = rangeCells;
            this.isRangeSelecting = true;

        }

        /**
         * 範囲内のセルを計算
         */
        _calculateRangeCells(startCell, endCell) {
            const table = startCell.closest('table');
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            
            // 開始・終了セルの位置を取得
            const startPos = this._getCellPosition(startCell, rows);
            const endPos = this._getCellPosition(endCell, rows);
            
            // 範囲の上下左右を決定
            const minRow = Math.min(startPos.row, endPos.row);
            const maxRow = Math.max(startPos.row, endPos.row);
            const minCol = Math.min(startPos.col, endPos.col);
            const maxCol = Math.max(startPos.col, endPos.col);
            
            // 範囲内のセルを収集
            const rangeCells = [];
            for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                const row = rows[rowIndex];
                const cells = Array.from(row.querySelectorAll('td[data-field-code]'));
                
                for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
                    if (cells[colIndex]) {
                        rangeCells.push(cells[colIndex]);
                    }
                }
            }
            
            return rangeCells;
        }

        /**
         * セルの位置を取得
         */
        _getCellPosition(cell, rows) {
            const row = cell.closest('tr');
            const rowIndex = rows.indexOf(row);
            const cells = Array.from(row.querySelectorAll('td[data-field-code]'));
            const colIndex = cells.indexOf(cell);
            
            return { row: rowIndex, col: colIndex };
        }

        /**
         * 範囲選択をクリア
         */
        _clearRangeSelection() {
            if (this.selectedRange.cells.length > 0) {
                this.selectedRange.cells.forEach(cell => {
                    cell.classList.remove('cell-range-selected');
                });
            }
            
            this.selectedRange = {
                start: null,
                end: null,
                cells: []
            };
            this.isRangeSelecting = false;
        }

        /**
         * キーボードショートカット処理
         */
        _handleKeyboardShortcut(event) {
            switch (event.key.toLowerCase()) {
                case 'c':
                    event.preventDefault();
                    this._handleCopy();
                    break;
                case 'v':
                    event.preventDefault();
                    this._handlePaste();
                    break;
                case 'x':
                    event.preventDefault();
                    this._handleCut();
                    break;
                case 'a':
                    event.preventDefault();
                    this._handleSelectAll();
                    break;
            }
        }

        /**
         * タブナビゲーション処理
         */
        _handleTabNavigation(isShiftTab) {
            const currentCell = this.selectedCell;
            const direction = isShiftTab ? 'ArrowLeft' : 'ArrowRight';
            
            let targetCell = this._getAdjacentCell(currentCell, direction);
            
            // 行の端まで来た場合は次の行の最初/最後のセルに移動
            if (!targetCell) {
                const row = currentCell.closest('tr');
                const table = currentCell.closest('table');
                const rows = Array.from(table.querySelectorAll('tbody tr'));
                const currentRowIndex = rows.indexOf(row);
                
                if (isShiftTab && currentRowIndex > 0) {
                    // 前の行の最後のセル
                    const prevRow = rows[currentRowIndex - 1];
                    const prevRowCells = Array.from(prevRow.querySelectorAll('td[data-field-code]'));
                    targetCell = prevRowCells[prevRowCells.length - 1];
                } else if (!isShiftTab && currentRowIndex < rows.length - 1) {
                    // 次の行の最初のセル
                    const nextRow = rows[currentRowIndex + 1];
                    const nextRowCells = Array.from(nextRow.querySelectorAll('td[data-field-code]'));
                    targetCell = nextRowCells[0];
                }
            }
            
            if (targetCell) {
                this.selectCell(targetCell);
                this._clearRangeSelection();
            }
        }

        /**
         * 削除処理
         */
        _handleDelete() {
            const cellsToDelete = this.isRangeSelecting ? this.selectedRange.cells : [this.selectedCell];
            
            cellsToDelete.forEach(cell => {
                const fieldCode = cell.getAttribute('data-field-code');
                
                // 編集可能なセルのみ削除
                if (this._isEditableField(fieldCode)) {
                    cell.textContent = '';
                    
                    // 初期値と比較してハイライト制御（共通ヘルパー使用）
                    window.CommonHighlightHelper.updateCellAndRowHighlight(cell, '');
                }
            });
        }

        /**
         * コピー処理
         */
        _handleCopy() {
            const cellsToTCopy = this.isRangeSelecting ? this.selectedRange.cells : [this.selectedCell];
            
            // セルの値をクリップボード形式で保存
            this.clipboard = cellsToTCopy.map(cell => ({
                value: cell.textContent,
                fieldCode: cell.getAttribute('data-field-code')
            }));
            
            // テキスト形式でも保存（他のアプリケーションとの互換性）
            const textContent = cellsToTCopy.map(cell => cell.textContent).join('\t');
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(textContent);
            }
        }

        /**
         * ペースト処理
         */
        _handlePaste() {
            if (!this.clipboard || this.clipboard.length === 0) {
                return;
            }
            
            const startCell = this.selectedCell;
            if (!startCell) {
                return;
            }
            
            // 単一セルのコピーの場合は現在のセルにペースト
            if (this.clipboard.length === 1) {
                const clipboardItem = this.clipboard[0];
                const fieldCode = startCell.getAttribute('data-field-code');
                
                if (this._isEditableField(fieldCode)) {
                    startCell.textContent = clipboardItem.value;
                    
                    // ハイライト制御（共通ヘルパー使用）
                    window.CommonHighlightHelper.updateCellAndRowHighlight(startCell, clipboardItem.value);
                }
            }
            
        }

        /**
         * カット処理
         */
        _handleCut() {
            this._handleCopy();
            this._handleDelete();
        }

        /**
         * 全選択処理（将来拡張用）
         */
        _handleSelectAll() {
            // 現在の実装では未対応
            console.log('🎯 全選択（未実装）');
        }

        /**
         * 編集可能フィールドかチェック
         */
        _isEditableField(fieldCode) {
            const field = window.fieldsConfig.find(f => f.fieldCode === fieldCode);
            
            if (!field) {
                return false;
            }
            
            // editableFromがallのフィールドのみ編集可能
            if (field.editableFrom !== 'all') {
                return false;
            }
            
            return true;
        }

        /**
         * セルアドレスを取得（デバッグ用）
         */
        _getCellAddress(cell) {
            if (!cell) return 'null';
            
            const row = cell.closest('tr');
            const table = cell.closest('table');
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            const cells = Array.from(row.querySelectorAll('td[data-field-code]'));
            
            const rowIndex = rows.indexOf(row) + 1; // 1から始める
            const colIndex = cells.indexOf(cell) + 1; // 1から始める
            const fieldCode = cell.getAttribute('data-field-code');
            
            return `${fieldCode}[${rowIndex},${colIndex}]`;
        }
    }

    // =============================================================================
    // グローバルエクスポート
    // =============================================================================

    // LedgerV2名前空間にエクスポート
    window.LedgerV2.TableInteract.CellSelectionManager = CellSelectionManager;

    // インスタンス作成
    window.LedgerV2.TableInteract.cellSelectionManager = new CellSelectionManager();

    // レガシー互換性のためグローバルに割り当て
    window.cellSelectionManager = window.LedgerV2.TableInteract.cellSelectionManager;

})();
