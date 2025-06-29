/*!
 * 🔄 統合台帳システムv2 - セル交換機能
 * @description 主キーフィールド間のドラッグ&ドロップによる値交換専用モジュール
 * @version 2.0.0
 * @created 2024-12
 * 
 * ✅ **責任範囲**
 * ✅ 主キーセル間のドラッグ&ドロップ値交換
 * ✅ ドラッグ状態管理・視覚的フィードバック
 * ✅ 同一列内での値交換制限・バリデーション
 * ✅ 交換後のハイライト制御（初期値との比較）
 * ✅ HTML5 Drag&Drop API統合管理
 * 
 * ❌ **やってはいけないこと（責任範囲外）**
 * ❌ セル編集・インライン編集（inline-edit.jsの責任）
 * ❌ セル選択・キーボード操作（cell-selection.jsの責任）
 * ❌ 一般的なテーブルイベント処理（table-events.jsの責任）
 * ❌ テーブル描画・DOM構築（table-render.jsの責任）
 * ❌ スタイル定義（table-interaction.cssの責任）
 * 
 * 🎯 **対象フィールド**
 * - 座席番号 (data-is-primary-key="true")
 * - PC番号 (data-is-primary-key="true") 
 * - 内線番号 (data-is-primary-key="true")
 * - ユーザーID (data-is-primary-key="true")
 * 
 * 📦 **含まれるクラス**
 * - CellSwapManager: セル交換メイン管理クラス
 * 
 * 🔗 **依存関係**
 * - CellValueHelper (セル値操作 - utils.js)
 * - StyleManager (ハイライト管理 - utils.js)
 * - window.fieldsConfig (フィールド設定 - config.js)
 * - HTML5 Drag&Drop API
 * 
 * 💡 **使用例**
 * ```javascript
 * // 初期化
 * const cellSwapManager = new CellSwapManager();
 * cellSwapManager.initializeDragDrop();
 * 
 * // テーブル更新後の再初期化
 * cellSwapManager.initializeDragDrop();
 * ```
 * 
 * 🎨 **視覚的効果**
 * - ドラッグ中: 薄いオレンジ背景 + 点線境界線
 * - ドロップ対象: 薄い緑背景 + 実線境界線
 * - ホバー時: "ドラッグで値を交換" ツールチップ表示
 * 
 * 🔧 **パフォーマンス最適化**
 * - 現在のドロップ対象セルを変数管理（DOM検索最小化）
 * - 軽量なCSSスタイル（box-shadow・transform削除）
 * - イベントリスナーの適切な管理・クリーンアップ
 */
(function() {
    'use strict';

    // グローバル名前空間確保
    window.LedgerV2 = window.LedgerV2 || {};
    window.LedgerV2.TableInteract = window.LedgerV2.TableInteract || {};

    // =============================================================================
    // 🔄 セル交換管理（ドラッグ&ドロップ）
    // =============================================================================

    class CellSwapManager {
        constructor() {
            this.draggedCell = null;
            this.isSwapDrag = false;
            this.currentDropTarget = null; // 現在のドロップ対象セル
        }

        /**
         * ドラッグ&ドロップイベントを初期化
         */
        initializeDragDrop() {
            // 主キーセルにdraggable属性を設定
            this._setupDraggableCells();
            
            // 現在の編集モード状態を適用
            const isEditMode = this._isEditModeActive();
            this.onEditModeChanged(isEditMode);
        }

        /**
         * 特定の行の主キーセルにドラッグ機能を設定（分離行用）
         */
        setupDragDropForRow(row) {
            const primaryKeyCells = row.querySelectorAll('td[data-is-primary-key="true"]');
            
            primaryKeyCells.forEach(cell => {
                // 既にイベントが設定されている場合はスキップ
                if (cell._swapListeners) {
                    return;
                }

                cell.draggable = true;
                
                // イベントリスナーを追加
                const dragStartHandler = (e) => this._handleDragStart(e, cell);
                const dragOverHandler = (e) => this._handleDragOver(e, cell);
                const dragLeaveHandler = (e) => this._handleDragLeave(e, cell);
                const dropHandler = (e) => this._handleDrop(e, cell);
                const dragEndHandler = (e) => this._handleDragEnd(e, cell);
                
                cell.addEventListener('dragstart', dragStartHandler);
                cell.addEventListener('dragover', dragOverHandler);
                cell.addEventListener('dragleave', dragLeaveHandler);
                cell.addEventListener('drop', dropHandler);
                cell.addEventListener('dragend', dragEndHandler);
                
                // リスナー参照を保存（クリーンアップ用）
                cell._swapListeners = {
                    dragstart: dragStartHandler,
                    dragover: dragOverHandler,
                    dragleave: dragLeaveHandler,
                    drop: dropHandler,
                    dragend: dragEndHandler
                };
            });
        }

        /**
         * 主キーセルにドラッグ可能属性を設定
         */
        _setupDraggableCells() {
            // テーブル更新時に再実行するため、既存のイベントリスナーをクリーンアップ
            this._cleanupDragListeners();
            
            // 🔄 表示されている主キーセルのみを対象にする（オートフィルタ対応）
            const primaryKeyCells = this._getVisiblePrimaryKeyCells();
            
            primaryKeyCells.forEach(cell => {
                cell.draggable = true;
                
                // イベントリスナーを追加
                const dragStartHandler = (e) => this._handleDragStart(e, cell);
                const dragOverHandler = (e) => this._handleDragOver(e, cell);
                const dragLeaveHandler = (e) => this._handleDragLeave(e, cell);
                const dropHandler = (e) => this._handleDrop(e, cell);
                const dragEndHandler = (e) => this._handleDragEnd(e, cell);
                
                cell.addEventListener('dragstart', dragStartHandler);
                cell.addEventListener('dragover', dragOverHandler);
                cell.addEventListener('dragleave', dragLeaveHandler);
                cell.addEventListener('drop', dropHandler);
                cell.addEventListener('dragend', dragEndHandler);
                
                // リスナー参照を保存（クリーンアップ用）
                cell._swapListeners = {
                    dragstart: dragStartHandler,
                    dragover: dragOverHandler,
                    dragleave: dragLeaveHandler,
                    drop: dropHandler,
                    dragend: dragEndHandler
                };
                
            });
        }

        /**
         * 🔄 表示されている主キーセルのみを取得（オートフィルタ対応）
         */
        _getVisiblePrimaryKeyCells() {
            const tbody = document.querySelector('#my-tbody');
            if (!tbody) return [];
            
            const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(row => {
                // 行が表示されているかチェック
                const style = window.getComputedStyle(row);
                return style.display !== 'none' && style.visibility !== 'hidden';
            });
            
            const visiblePrimaryKeyCells = [];
            visibleRows.forEach(row => {
                const primaryKeyCells = row.querySelectorAll('td[data-is-primary-key="true"]');
                visiblePrimaryKeyCells.push(...primaryKeyCells);
            });
            
            return visiblePrimaryKeyCells;
        }

        /**
         * 既存のドラッグイベントリスナーをクリーンアップ
         */
        _cleanupDragListeners() {
            // 🔄 すべての主キーセル（表示・非表示問わず）からリスナーを削除
            const allPrimaryKeyCells = document.querySelectorAll('td[data-is-primary-key="true"]');
            allPrimaryKeyCells.forEach(cell => {
                if (cell._swapListeners) {
                    cell.removeEventListener('dragstart', cell._swapListeners.dragstart);
                    cell.removeEventListener('dragover', cell._swapListeners.dragover);
                    cell.removeEventListener('dragleave', cell._swapListeners.dragleave);
                    cell.removeEventListener('drop', cell._swapListeners.drop);
                    cell.removeEventListener('dragend', cell._swapListeners.dragend);
                    delete cell._swapListeners;
                }
            });
        }

        /**
         * ドラッグ開始処理
         */
        _handleDragStart(event, cell) {
            // 編集モードチェック
            if (!this._isEditModeActive()) {
                event.preventDefault();
                return;
            }

            // 分離ボタンからのドラッグの場合は無効化
            if (event.target && event.target.classList.contains('separate-btn')) {
                event.preventDefault();
                return;
            }

            // 主キーフィールドかチェック
            if (!this._isPrimaryKeyField(cell)) {
                event.preventDefault();
                return;
            }

            this.draggedCell = cell;
            this.isSwapDrag = true;

            // ドラッグ中の視覚的スタイル
            cell.style.opacity = '0.7';
            cell.classList.add('swap-dragging');
            
            // データ転送設定
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', cell.outerHTML);
            
            // ドラッグアイコンをカスタマイズ
            this._setDragImage(event, cell);
        }

        /**
         * ドラッグオーバー処理（軽量化版）
         */
        _handleDragOver(event, cell) {
            if (!this.isSwapDrag || !this.draggedCell) return;

            // 同じ列（フィールド）かチェック
            const draggedFieldCode = this.draggedCell.getAttribute('data-field-code');
            const targetFieldCode = cell.getAttribute('data-field-code');
            
            if (draggedFieldCode === targetFieldCode && this._isPrimaryKeyField(cell)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                
                // 前のドロップ対象セルと同じ場合は何もしない（パフォーマンス向上）
                if (this.currentDropTarget === cell) {
                    return;
                }
                
                // 前のドロップ対象からスタイルを削除
                if (this.currentDropTarget) {
                    this.currentDropTarget.classList.remove('swap-drop-target');
                }
                
                // 新しいドロップ対象にスタイルを適用
                cell.classList.add('swap-drop-target');
                this.currentDropTarget = cell;
            } else {
                // 無効なドロップ対象の場合
                this._clearDropTarget();
            }
        }

        /**
         * ドロップ対象クリア（軽量化）
         */
        _clearDropTarget() {
            if (this.currentDropTarget) {
                this.currentDropTarget.classList.remove('swap-drop-target');
                this.currentDropTarget = null;
            }
        }

        /**
         * ドラッグリーブ処理（セルからマウスが離れた時）
         */
        _handleDragLeave(event, cell) {
            if (!this.isSwapDrag || !this.draggedCell) return;

            // 現在のドロップ対象セルの場合のみクリア
            if (this.currentDropTarget === cell) {
                this._clearDropTarget();
            }
        }

        /**
         * ドロップ処理
         */
        _handleDrop(event, targetCell) {
            event.preventDefault();
            
            if (!this.isSwapDrag || !this.draggedCell) return;

            // 同じセルの場合はキャンセル
            if (this.draggedCell === targetCell) {
                this._cleanupDrag();
                return;
            }

            // 同じ列（フィールド）かチェック
            const sourceFieldCode = this.draggedCell.getAttribute('data-field-code');
            const targetFieldCode = targetCell.getAttribute('data-field-code');
            
            if (sourceFieldCode !== targetFieldCode) {
                console.warn('⚠️ 同じ列内でのみセル交換が可能です');
                this._cleanupDrag();
                return;
            }

            // 主キーフィールドかチェック
            if (!this._isPrimaryKeyField(targetCell)) {
                console.warn('⚠️ 主キーフィールドでのみセル交換が可能です');
                this._cleanupDrag();
                return;
            }

            // 🔄 関連フィールド一括交換を実行
            this._performRelatedFieldsExchange(this.draggedCell, targetCell);
            
            this._cleanupDrag();
        }

        /**
         * 関連フィールド一括交換を実行
         * @param {HTMLElement} sourceCell - ソースセル（ドラッグ元）
         * @param {HTMLElement} targetCell - ターゲットセル（ドロップ先）
         */
        _performRelatedFieldsExchange(sourceCell, targetCell) {
            try {
                
                const sourceRow = sourceCell.closest('tr');
                const targetRow = targetCell.closest('tr');
                
                if (!sourceRow || !targetRow) {
                    console.error('❌ ソース行またはターゲット行が見つかりません');
                    return;
                }

                // ソースセルのアプリタイプを取得
                const sourceApp = sourceCell.getAttribute('data-source-app');
                if (!sourceApp) {
                    console.error('❌ ソースアプリが特定できません');
                    return;
                }

                // 関連フィールドを取得
                const relatedFields = this._getRelatedFields(sourceApp);

                const exchangedCells = [];
                
                relatedFields.forEach(fieldCode => {
                    const sourceFieldCell = window.DOMHelper.findCellInRow(sourceRow, fieldCode);
                    const targetFieldCell = window.DOMHelper.findCellInRow(targetRow, fieldCode);
                    
                    if (sourceFieldCell && targetFieldCell) {
                        this._exchangeSingleField(sourceFieldCell, targetFieldCell);
                        exchangedCells.push(sourceFieldCell, targetFieldCell);
                    }
                });

                // ハイライト更新
                this._updateHighlights(...exchangedCells);

                // 交換後に空になった行を削除
                this._removeEmptyRowsAfterExchange([sourceRow, targetRow]);
                
            } catch (error) {
                console.error('❌ 関連フィールド交換エラー:', error);
            }
        }

        /**
         * 指定されたsourceAppに関連するフィールドコードを取得
         * @param {string} sourceApp - ソースアプリ名
         * @returns {Array<string>} 関連フィールドコードの配列
         */
        _getRelatedFields(sourceApp) {
            return window.fieldsConfig
                .filter(field => field.sourceApp === sourceApp)
                .map(field => field.fieldCode);
        }

        /**
         * 単一フィールドの値を交換
         * @param {HTMLElement} sourceCell - ソースセル
         * @param {HTMLElement} targetCell - ターゲットセル
         */
        _exchangeSingleField(sourceCell, targetCell) {
            try {
                const sourceValue = CellValueHelper.getValue(sourceCell);
                const targetValue = CellValueHelper.getValue(targetCell);

                CellValueHelper.setValue(sourceCell, targetValue);
                CellValueHelper.setValue(targetCell, sourceValue);
                
            } catch (error) {
                console.error('❌ 単一フィールド交換エラー:', error);
            }
        }

        /**
         * ドラッグ終了処理
         */
        _handleDragEnd(event, cell) {
            this._cleanupDrag();
        }

        /**
         * ドラッグ関連のクリーンアップ（軽量化版）
         */
        _cleanupDrag() {
            // ドラッグ中のセルをクリーンアップ
            if (this.draggedCell) {
                this.draggedCell.classList.remove('swap-dragging');
                this.draggedCell.style.opacity = '';
                this.draggedCell.style.cursor = 'grab'; // ドラッグ終了後はgrabに戻す
            }

            // ドロップ対象セルをクリーンアップ
            this._clearDropTarget();

            // 状態をリセット
            this.draggedCell = null;
            this.isSwapDrag = false;
        }

        /**
         * 主キーフィールドかチェック
         */
        _isPrimaryKeyField(cell) {
            const fieldCode = cell.getAttribute('data-field-code');
            const field = window.fieldsConfig.find(f => f.fieldCode === fieldCode);
            return field && field.isPrimaryKey === true;
        }

        /**
         * カスタムドラッグアイコン設定
         */
        _setDragImage(event, cell) {
            const dragImage = document.createElement('div');
            dragImage.style.cssText = `
                background: rgba(255, 193, 7, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                position: absolute;
                top: -1000px;
                left: -1000px;
                border: 2px dashed #ff9800;
            `;
            dragImage.textContent = `🔄 ${CellValueHelper.getValue(cell)}`;
            
            document.body.appendChild(dragImage);
            event.dataTransfer.setDragImage(dragImage, 20, 20);
            
            // ドラッグ終了後にクリーンアップ
            setTimeout(() => {
                if (document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                }
            }, 100);
        }

        /**
         * セル交換後のハイライト更新
         * @param {...HTMLElement} cells - ハイライト対象のセル群
         */
        _updateHighlights(...cells) {
            // 各セルのハイライトを更新
            window.CommonHighlightHelper.updateMultipleCellsHighlight(cells);
            
            // 影響を受けた行を特定して、行全体の変更状態を再評価
            const affectedRows = new Set();
            cells.forEach(cell => {
                const row = cell.closest('tr');
                if (row) {
                    affectedRows.add(row);
                }
            });
            
            // 各行の変更状態を再評価と統合キーの再構築
            affectedRows.forEach(row => {
                this._reevaluateRowModificationState(row);
                this._reevaluateUnlinkedLedgerStyles(row);
                this._rebuildIntegrationKey(row);
            });
        }

        /**
         * 行の変更状態を再評価
         * @param {HTMLElement} row - 対象行
         */
        _reevaluateRowModificationState(row) {
            if (!row) return;
            
            const cells = row.querySelectorAll('td[data-field-code]');
            let hasAnyModification = false;
            
            cells.forEach(cell => {
                const fieldCode = cell.getAttribute('data-field-code');
                
                // システムフィールドは変更状態の評価から除外
                if (fieldCode.endsWith('_record_id') || 
                    fieldCode === '_row_number' || 
                    fieldCode === '_modification_checkbox' || 
                    fieldCode === '_hide_button') {
                    // システムフィールドのハイライトを削除
                    cell.classList.remove('cell-modified');
                    return;
                }
                
                // セルの現在値と初期値を比較
                const currentValue = this._extractCellValue(cell);
                const originalValue = cell.getAttribute('data-original-value') || '';
                
                if (currentValue !== originalValue) {
                    hasAnyModification = true;
                    cell.classList.add('cell-modified');
                } else {
                    cell.classList.remove('cell-modified');
                }
            });
            
            // 行全体の変更状態を更新
            if (hasAnyModification) {
                row.classList.add('row-modified');
                // チェックボックスを自動的にONにする
                if (window.StyleManager && window.StyleManager._updateModificationCheckbox) {
                    window.StyleManager._updateModificationCheckbox(row, true);
                }
            } else {
                row.classList.remove('row-modified');
                // チェックボックスを自動的にOFFにする
                if (window.StyleManager && window.StyleManager._updateModificationCheckbox) {
                    window.StyleManager._updateModificationCheckbox(row, false);
                }
            }
        }

        /**
         * セル交換後にcell-unlinked-ledgerクラスの状態を再評価
         * @param {HTMLElement} row - 対象行
         */
        _reevaluateUnlinkedLedgerStyles(row) {
            if (!row) return;

            // 台帳アプリの主キーフィールドをチェック
            const sourceApps = new Set();
            const primaryKeysByApp = {};
            
            // 各フィールドの sourceApp を収集し、主キーフィールドを特定
            window.fieldsConfig.forEach(field => {
                if (field.sourceApp && field.sourceApp !== 'system') {
                    sourceApps.add(field.sourceApp);
                    if (field.isPrimaryKey) {
                        primaryKeysByApp[field.sourceApp] = field.fieldCode;
                    }
                }
            });
            
            // 各台帳アプリについて主キーの値をチェック
            sourceApps.forEach(sourceApp => {
                const primaryKeyField = primaryKeysByApp[sourceApp];
                if (primaryKeyField) {
                    const primaryKeyCell = row.querySelector(`td[data-field-code="${primaryKeyField}"]`);
                    const primaryKeyValue = primaryKeyCell ? this._extractCellValue(primaryKeyCell) : '';
                    
                    // その台帳のすべてのフィールドセルを取得
                    const cells = row.querySelectorAll(`td[data-source-app="${sourceApp}"]`);
                    
                    if (!primaryKeyValue || primaryKeyValue.trim() === '') {
                        // 主キーが空の場合、cell-unlinked-ledgerクラスを付与
                        cells.forEach(cell => {
                            cell.classList.add('cell-unlinked-ledger');
                        });
                    } else {
                        // 主キーが設定されている場合、cell-unlinked-ledgerクラスを削除
                        cells.forEach(cell => {
                            cell.classList.remove('cell-unlinked-ledger');
                        });
                    }
                }
            });
        }

        /**
         * セルから値を安全に抽出
         * @param {HTMLElement} cell - セル要素
         * @returns {string} セル値
         */
        _extractCellValue(cell) {
            try {
                if (!cell) return '';
                
                // CellValueHelperが利用可能な場合
                if (window.CellValueHelper && window.CellValueHelper.getValue) {
                    const value = window.CellValueHelper.getValue(cell);
                    if (value && value.trim()) {
                        return value;
                    }
                }
                
                // selectタグの場合は選択された値のみを取得
                const select = cell.querySelector('select');
                if (select) {
                    return select.value ? select.value.trim() : '';
                }
                
                // その他の入力要素がある場合
                const input = cell.querySelector('input, textarea');
                if (input && input.value && input.value.trim()) {
                    return input.value.trim();
                }
                
                // 主キー値スパンがある場合
                const primaryKeyValue = cell.querySelector('.primary-key-value');
                if (primaryKeyValue && primaryKeyValue.textContent && primaryKeyValue.textContent.trim()) {
                    return primaryKeyValue.textContent.trim();
                }
                
                // 通常のテキストセル（分離ボタン絵文字を除外）
                const textContent = cell.textContent || '';
                const cleanText = textContent.replace(/✂️/g, '').trim();
                return cleanText;
                
            } catch (error) {
                console.error('❌ セル値抽出エラー:', error, cell);
                return '';
            }
        }

        /**
         * テーブルの行番号を更新
         */
        _updateRowNumbers() {
            try {
                const tbody = document.querySelector('#my-tbody');
                if (!tbody) {
                    console.warn('⚠️ テーブルボディが見つかりません');
                    return;
                }

                const rows = tbody.querySelectorAll('tr');

                rows.forEach(row => {
                    // 元の行番号を取得（data-row-idから）
                    const originalRowNumber = row.getAttribute('data-row-id');
                    
                    // 行番号セルに元の行番号を設定（連番ではなく元の番号を保持）
                    const rowNumberCell = row.querySelector('td[data-field-code]:first-child');
                    if (rowNumberCell && originalRowNumber) {
                        const field = window.fieldsConfig.find(f => f.fieldCode === rowNumberCell.getAttribute('data-field-code'));
                        if (field && field.isRowNumber) {
                            rowNumberCell.textContent = originalRowNumber;
                        }
                    }
                });
                
                console.log('✅ 行番号更新完了: 元の行番号を保持');
                
            } catch (error) {
                console.error('❌ 行番号更新エラー:', error);
            }
        }

        /**
         * 実際の行番号を取得（ページング環境対応）
         * @param {HTMLElement} row - 行要素
         * @returns {number} 実際の行番号
         */
        _getActualRowNumber(row) {
            try {
                // 行番号セルから直接取得
                const rowNumberCell = row.querySelector('td[data-field-code]:first-child');
                if (rowNumberCell) {
                    const cellText = rowNumberCell.textContent.trim();
                    const rowNumber = parseInt(cellText);
                    if (!isNaN(rowNumber)) {
                        return rowNumber;
                    }
                }
                
                // フォールバック: data-row-id
                const displayRowId = row.getAttribute('data-row-id');
                return parseInt(displayRowId) || 0;
                
            } catch (error) {
                console.error('❌ 実際の行番号取得エラー:', error);
                return 0;
            }
        }

        /**
         * 交換後に空になった行を削除
         * @param {Array<HTMLElement>} rows - チェック対象の行配列
         */
        _removeEmptyRowsAfterExchange(rows) {
            try {
                let removedRowsCount = 0;

                console.log('🔍 空行削除開始:', { rowsCount: rows.length });

                rows.forEach((row, index) => {
                    const isEmpty = this._checkRowEmpty(row);
                    const integrationKey = row.getAttribute('data-integration-key');
                    
                    console.log(`🔍 行${index + 1}の空行チェック:`, {
                        integrationKey: integrationKey,
                        isEmpty: isEmpty,
                        rowHTML: row.outerHTML.substring(0, 200) + '...'
                    });
                    
                    if (isEmpty) {
                        console.log('🗑️ 空行を削除:', { integrationKey });
                        row.remove();
                        removedRowsCount++;
                    }
                });

                console.log('✅ 空行削除完了:', { removedRowsCount });

                // 行が削除された場合、行番号を更新
                if (removedRowsCount > 0) {
                    this._updateRowNumbers();
                }
                
            } catch (error) {
                console.error('❌ 交換後空行削除エラー:', error);
            }
        }

        /**
         * 行が空かどうかをチェック
         * @param {HTMLElement} row - 対象行
         * @returns {boolean} 空行かどうか
         */
        _checkRowEmpty(row) {
            if (!row) return false;
            
            const cells = row.querySelectorAll('td[data-field-code]');
            const nonEmptyCells = [];
            
            console.log('🔍 空行チェック開始:', {
                integrationKey: row.getAttribute('data-integration-key'),
                cellsCount: cells.length
            });
            
            for (const cell of cells) {
                const fieldCode = cell.getAttribute('data-field-code');
                
                // 除外対象フィールド
                if (fieldCode.endsWith('_record_id') || 
                    fieldCode === '_row_number' || 
                    fieldCode === '_modification_checkbox' || 
                    fieldCode === '_hide_button') {
                    continue;
                }
                
                const cellValue = this._extractCellValue(cell);
                
                console.log('🔍 セル値チェック:', {
                    fieldCode: fieldCode,
                    cellValue: cellValue,
                    cellHTML: cell.innerHTML.substring(0, 100) + '...'
                });
                
                // 値があるかチェック
                if (cellValue && cellValue.trim() && cellValue.trim() !== '---') {
                    nonEmptyCells.push({ fieldCode, cellValue });
                }
            }
            
            const isEmpty = nonEmptyCells.length === 0;
            
            console.log('🔍 空行チェック結果:', {
                integrationKey: row.getAttribute('data-integration-key'),
                isEmpty: isEmpty,
                nonEmptyCells: nonEmptyCells
            });
            
            return isEmpty;
        }

        /**
         * 行の統合キーを再構築
         * @param {HTMLElement} row - 対象行
         */
        _rebuildIntegrationKey(row) {
            if (!row) return;
            
            try {
                // 既存のIntegrationKeyHelperを使用して統合キーを生成
                const newIntegrationKey = window.IntegrationKeyHelper.generateFromRow(row) || '';
                const oldIntegrationKey = row.getAttribute('data-integration-key') || '';
                
                if (newIntegrationKey !== oldIntegrationKey) {
                    row.setAttribute('data-integration-key', newIntegrationKey);
                }
                
            } catch (error) {
                console.error('❌ 統合キー再構築エラー:', error);
            }
        }

        /**
         * 編集モードがアクティブかどうかをチェック
         * @returns {boolean} 編集モードがアクティブかどうか
         */
        _isEditModeActive() {
            return window.editModeManager && window.editModeManager.isEditMode;
        }

        /**
         * 編集モード変更通知を受け取る
         * @param {boolean} isEditMode - 編集モードかどうか
         */
        onEditModeChanged(isEditMode) {
            
            if (isEditMode) {
                // 編集モード: ドラッグ機能を有効化
                this._enableDragDropForAllCells();
            } else {
                // 閲覧モード: ドラッグ機能を無効化  
                this._disableDragDropForAllCells();
            }
        }

        /**
         * 全セルのドラッグ機能を有効化
         */
        _enableDragDropForAllCells() {
            const primaryKeyCells = document.querySelectorAll('td[data-is-primary-key="true"]');
            primaryKeyCells.forEach(cell => {
                cell.draggable = true;
                cell.classList.add('draggable-cell');
                // 主キーセルのみドラッグカーソルを設定
                cell.style.cursor = 'grab';
            });
        }

        /**
         * 全セルのドラッグ機能を無効化
         */
        _disableDragDropForAllCells() {
            const primaryKeyCells = document.querySelectorAll('td[data-is-primary-key="true"]');
            primaryKeyCells.forEach(cell => {
                cell.draggable = false;
                cell.classList.remove('draggable-cell');
                // 主キーセルのドラッグ関連スタイルのみリセット
                cell.style.cursor = '';
            });
        }
    }

    // =============================================================================
    // グローバルエクスポート
    // =============================================================================

    // LedgerV2名前空間にエクスポート
    window.LedgerV2.TableInteract.CellSwapManager = CellSwapManager;

    // インスタンス作成
    window.LedgerV2.TableInteract.cellSwapManager = new CellSwapManager();



})();

