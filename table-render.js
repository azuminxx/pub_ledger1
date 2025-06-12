/**
 * 統合台帳システム v2 - テーブル描画・表示
 * @description テーブル表示・セル作成・レンダリング機能
 * @version 2.0.0
 * 
 * 🎯 **ファイルの責任範囲**
 * ✅ データをテーブルに描画・表示
 * ✅ 各種セル要素の作成（テキスト・入力・選択・リンク・行番号）
 * ✅ ページネーションとの連携
 * ✅ テーブル行・セルのDOM構造作成
 * ✅ スタイル適用・CSS クラス設定
 * 
 * ❌ **やってはいけないこと（責任範囲外）**
 * ❌ ユーザーイベント処理（クリック・ドラッグ等）
 * ❌ インライン編集機能
 * ❌ システム初期化・設定管理
 * ❌ API通信・データ検索
 * ❌ ヘッダー・フィルター作成
 * 
 * 📦 **含まれるクラス**
 * - TableDisplayManager: メインの表示管理クラス
 * 
 * 🔗 **依存関係**
 * - DOMHelper (DOM操作)
 * - StyleManager (スタイル管理)
 * - FieldValueProcessor (値処理)
 * - dataManager (データ管理)
 * - window.paginationManager (ページネーション)
 * 
 * 💡 **使用例**
 * ```javascript
 * const tableManager = new TableDisplayManager();
 * tableManager.displayIntegratedData(records, null, false);
 * ```
 */
(function() {
    'use strict';

    // グローバル名前空間確保
    window.LedgerV2 = window.LedgerV2 || {};
    window.LedgerV2.TableRender = {};

    // =============================================================================
    // テーブル表示管理
    // =============================================================================

    class TableDisplayManager {
        constructor() {
            this.currentData = [];
            this.isEditMode = false;
        }

        /**
         * 統合データをテーブルに表示
         */
        async displayIntegratedData(integratedRecords, targetAppId = null, isPagedData = false) {
            const processId = window.BackgroundProcessMonitor.startProcess('テーブル描画');

            try {
                // グローバルにTableDisplayManagerを保存（ページング処理で使用）
                window.tableDisplayManager = this;

                if (!integratedRecords || integratedRecords.length === 0) {
                    console.log('📊 表示するデータがありません');
                    window.dataManager.clearTable();
                    this.currentData = [];
                    
                    if (processId) {
                        window.BackgroundProcessMonitor.updateProcess(processId, '完了', 'データなし');
                        setTimeout(() => window.BackgroundProcessMonitor.endProcess(processId), 500);
                    }
                return;
            }

                // 進行状況を更新
                if (processId) {
                    window.BackgroundProcessMonitor.updateProcess(processId, '実行中', 
                        `${integratedRecords.length}件のデータをテーブルに描画中...`);
                }

                console.log(`📊 統合データ表示開始: ${integratedRecords.length}件`);
                
                // 🔄 追加モードの場合は重複を除外
                let recordsToAdd = integratedRecords;
                if (window.dataManager?.appendMode) {
                    const existingKeys = window.dataManager.getExistingRecordKeys();
                    recordsToAdd = integratedRecords.filter(record => 
                        !existingKeys.has(record.integrationKey)
                    );
                }
                
                // データマネージャーにデータを保存
                if (window.dataManager) {
                    window.dataManager.setCurrentData(recordsToAdd);
                }

                // 現在のデータを保存
                this.currentData = recordsToAdd;

                // HTMLで既にテーブルが定義されているので、ヘッダー初期化のみ実行（追加モードでない場合のみ）
                if (!window.dataManager?.appendMode) {
                    await window.LedgerV2.TableHeader.TableCreator.createTable();
                }

                // テーブル本体を描画
                const tbody = document.getElementById('my-tbody');
                if (!tbody) {
                    console.error('❌ テーブル本体が見つかりません');
                    
                    if (processId) {
                        window.BackgroundProcessMonitor.updateProcess(processId, 'エラー', 'テーブル要素エラー');
                        setTimeout(() => window.BackgroundProcessMonitor.endProcess(processId), 1000);
                }
                return;
                }

                // 進行状況を更新
                if (processId) {
                    window.BackgroundProcessMonitor.updateProcess(processId, '実行中', 'ページングとテーブル行を準備中...');
                }

                // DataManagerのclearTable()を使用（追加モード考慮済み）
                window.dataManager.clearTable();

                // 🔄 追加モードの場合は追加件数が0なら処理終了
                if (window.dataManager?.appendMode && recordsToAdd.length === 0) {
                    if (processId) {
                        window.BackgroundProcessMonitor.updateProcess(processId, '完了', '追加対象なし（重複）');
                        setTimeout(() => window.BackgroundProcessMonitor.endProcess(processId), 500);
                    }
                    return;
                }

                // 🔄 ページングが必要かどうかを判定し、適切なデータを決定
                let recordsToDisplay = recordsToAdd;
                let shouldCreatePagination = false;

                // ページング処理
                if (window.paginationManager) {
                    if (!isPagedData && !window.dataManager?.appendMode && recordsToAdd.length > 100) {
                        // ページングが必要な場合：全データをページングマネージャーに設定し、最初の100件のみ表示
                        window.paginationManager.setAllData(recordsToAdd);
                        recordsToDisplay = window.paginationManager.getCurrentPageData();
                        shouldCreatePagination = true;
                        console.log(`📄 ページング適用: ${recordsToAdd.length}件中の${recordsToDisplay.length}件を表示（ページ1）`);
                    } else if (window.dataManager?.appendMode) {
                        // 追加モードの場合は既存のページング情報を更新
                        window.paginationManager.setAllData([...window.paginationManager.allData, ...recordsToAdd]);
                    }
                }

                // フィールド順序を取得（fieldsConfigから）
                const fieldOrder = window.fieldsConfig ? 
                    window.fieldsConfig.map(field => field.fieldCode) : 
                    [];

                // 表示するレコードを行として追加
                let baseRowNumber = window.dataManager?.appendMode ? window.dataManager.getNextRowNumber() - 1 : 0;
                recordsToDisplay.forEach((record, index) => {
                    const row = this._createTableRow(record, fieldOrder, targetAppId, index, baseRowNumber);
                    tbody.appendChild(row);
                });

                console.log(`✅ テーブル描画完了: ${recordsToDisplay.length}行を表示`);

                // 🔄 追加モードでない場合のみ最大行番号を設定
                if (!window.dataManager?.appendMode) {
                    this._setMaxRowNumberFromDisplayedData();
                }

                // ページングUIの作成/更新
                if (shouldCreatePagination && window.paginationUI) {
                    setTimeout(() => {
                        window.paginationUI.createPaginationUI();
                    }, 100);
                } else if (window.paginationUI && !isPagedData) {
                setTimeout(() => {
                    window.paginationUI.updatePaginationUI();
                }, 100);
            }

            // 🔄 セル交換機能の再初期化（テーブル描画完了後）
            setTimeout(() => {
                if (window.LedgerV2?.TableInteract?.cellSwapManager?.initializeDragDrop) {
                    window.LedgerV2.TableInteract.cellSwapManager.initializeDragDrop();
                }
            }, 200);

                // 🔍 追加モードでない場合のみオートフィルタ機能を初期化
                if (!window.dataManager?.appendMode) {
                    this._initializeAutoFilter();
                }

                // 完了状態を更新
                if (processId) {
                    window.BackgroundProcessMonitor.updateProcess(processId, '完了', 
                        `${recordsToAdd.length}件のテーブル表示完了`);
                    setTimeout(() => window.BackgroundProcessMonitor.endProcess(processId), 500);
                }

            } catch (error) {
                console.error('❌ テーブル描画エラー:', error);
                
                if (processId) {
                    window.BackgroundProcessMonitor.updateProcess(processId, 'エラー', 'テーブル描画エラー');
                    setTimeout(() => window.BackgroundProcessMonitor.endProcess(processId), 1000);
                }
                throw error;
            }
        }



        /**
         * テーブル行を作成
         */
        _createTableRow(record, fieldOrder, targetAppId, rowIndex = 0, baseRowNumber = 0) {
            const row = document.createElement('tr');
            const integrationKey = record.integrationKey || '';
            
            // 実際の行番号を計算（ページング環境対応）
            let actualRowNumber;
            if (window.paginationManager && window.paginationManager.allData.length > 100 && !window.dataManager.appendMode) {
                const paginationInfo = window.paginationManager.getPaginationInfo();
                actualRowNumber = paginationInfo.startRecord + rowIndex;
            } else if (window.dataManager?.appendMode) {
                // 追加モードでは DataManagerの基準値にindexを加算
                actualRowNumber = baseRowNumber + rowIndex + 1;
            } else {
                actualRowNumber = rowIndex + 1;
            }
            
            // data-row-idには実際の行番号を設定（表示行番号ではない）
            row.setAttribute('data-row-id', actualRowNumber);
            row.setAttribute('data-integration-key', integrationKey);

            // 行番号はfieldsConfigの_row_numberで処理されるため、自動追加は無効化

            // データセル作成
            fieldOrder.forEach(fieldCode => {
                const cell = this._createDataCell(record, fieldCode, row, rowIndex);
                row.appendChild(cell);
            });

            // 主キーが紐づいていない台帳フィールドにクラスを付与
            this._applyUnlinkedLedgerStyles(row, record);

            return row;
        }

        /**
         * データセルを作成
         * 🚨 PROTECTED: ②パターン（ページング時の直接input/select生成）で使用 - 削除禁止
         */
        _createDataCell(record, fieldCode, row, rowIndex = 0) {
            const cell = document.createElement('td');
            const field = window.fieldsConfig.find(f => f.fieldCode === fieldCode);
            
            if (!field) {
                cell.textContent = '';
                return cell;
            }

            // セル属性設定
            cell.setAttribute('data-field-code', fieldCode);
            cell.setAttribute('data-source-app', field.sourceApp || '');
            cell.classList.add('table-cell');

            if (field.isPrimaryKey) {
                cell.setAttribute('data-is-primary-key', 'true');
            }
            if (field.isRecordId) {
                cell.setAttribute('data-is-record-id', 'true');
            }
            
            // ユーザーから隠すフィールドの場合、専用クラスを追加
            if (field.isHiddenFromUser) {
                cell.classList.add('cell-hidden-from-user');
            }

            const value = FieldValueProcessor.process(record, fieldCode, '');
            
            // ✨ 初期値をdata属性に保存（ハイライト制御用）
            cell.setAttribute('data-original-value', value || '');
            
            const width = field.width || '100px';

            // セルタイプ別処理
            switch (field.cellType) {
                case 'row_number':
                    this._createRowNumberCell(cell, rowIndex);
                    break;
                case 'modification_checkbox':
                    this._createModificationCheckboxCell(cell, row);
                    break;
                case 'link':
                    this._createLinkCell(cell, value, record, field);
                    break;
                case 'input':
                    this._createInputCell(cell, value, field, row);
                    break;
                case 'select':
                case 'dropdown':
                    this._createSelectCell(cell, value, field, row);
                    break;
                default:
                    this._createTextCell(cell, value, field);
                    break;
            }

            StyleManager.applyCellStyles(cell, width);
            return cell;
        }

        /**
         * 行番号セルを作成
         */
        _createRowNumberCell(cell, rowIndex) {
            let displayRowNumber;
            let actualRowNumber;
            
            // 通常モード時：ページネーション情報を考慮
            if (window.paginationManager && window.paginationManager.allData.length > 100 && !window.dataManager.appendMode) {
                const paginationInfo = window.paginationManager.getPaginationInfo();
                displayRowNumber = paginationInfo.startRecord + rowIndex;
                actualRowNumber = displayRowNumber; // ページング環境では表示行番号 = 実際の行番号
            }
            // デフォルト（追加モード含む）：渡されたrowIndexをそのまま使用（1ベース）
            else {
                displayRowNumber = rowIndex + 1;
                actualRowNumber = displayRowNumber;
            }
            
            cell.textContent = displayRowNumber;
            cell.classList.add('row-number-cell', 'table-cell');
            
            // 行要素のdata-row-idが未設定の場合のみ設定（重複防止）
            const row = cell.closest('tr');
            if (row && !row.getAttribute('data-row-id')) {
                row.setAttribute('data-row-id', actualRowNumber);
            }
        }

        /**
         * 変更チェックボックスセルを作成
         */
        _createModificationCheckboxCell(cell, row) {
            // セルにスタイルクラスを適用
            cell.classList.add('modification-checkbox-cell', 'table-cell');
            
            // チェックボックス要素を作成
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('modification-checkbox');
            
            // 🔧 編集モード状態に応じて初期状態を設定
            const isEditMode = window.editModeManager && window.editModeManager.isEditMode;
            checkbox.disabled = !isEditMode; // 編集モードでは有効化、閲覧モードでは無効化
            
            // 🔧 rowが存在する場合のみrow-modifiedクラスをチェック
            checkbox.checked = row && row.classList ? row.classList.contains('row-modified') : false;
            
            cell.appendChild(checkbox);
        }

        /**
         * リンクセルを作成
         */
        _createLinkCell(cell, value, record, field) {
            if (!value) {
                cell.textContent = '';
                return;
            }

            const link = document.createElement('a');
            link.href = this._buildRecordUrl(record, field);
            link.target = '_blank';
            link.textContent = value;
            link.classList.add('record-link');

            cell.appendChild(link);
        }

        /**
         * 入力セルを作成
         * 🚨 PROTECTED: ②パターン（ページング時の直接input/select生成）で使用 - 削除禁止
         */
        _createInputCell(cell, value, field, row) {
            // 🚨 PROTECTED: ②パターン - 編集モード時の直接input要素作成処理
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value || '';
            input.style.width = '100%';
            input.style.border = 'none';
            input.style.background = 'transparent';
            input.style.outline = 'none';
            
            // フィールド幅に応じたinput幅設定
            const fieldWidth = field.width || '100px';
            const inputWidthClass = this._getInputWidthClass(fieldWidth);
            if (inputWidthClass) {
                input.classList.add(inputWidthClass);
            }

            // 🔧 input要素の値変更時イベントハンドラを設定
            this._attachCellModificationListeners(input, cell, row);

            cell.appendChild(input);
        }

        /**
         * セレクトセルを作成
         * 🚨 PROTECTED: ②パターン（ページング時の直接input/select生成）で使用 - 削除禁止
         */
        _createSelectCell(cell, value, field, row) {
            // 🚨 PROTECTED: ②パターン - 編集モード時の直接select要素作成処理
            const select = document.createElement('select');
            select.style.width = '100%';
            select.style.border = 'none';
            select.style.background = 'transparent';

            // 空のオプション
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '';
            select.appendChild(emptyOption);

            // オプション追加
            if (field.options) {
                field.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    // オプションが文字列の場合とオブジェクトの場合に対応
                    const optionValue = typeof option === 'string' ? option : option.value;
                    const optionLabel = typeof option === 'string' ? option : option.label;
                    
                    optionElement.value = optionValue;
                    optionElement.textContent = optionLabel;
                    if (optionValue === value) {
                        optionElement.selected = true;
                    }
                    select.appendChild(optionElement);
                });
            }

            select.value = value || '';

            // 🔧 select要素の値変更時イベントハンドラを設定
            this._attachCellModificationListeners(select, cell, row);

            cell.appendChild(select);
        }

        /**
         * テキストセルを作成
         */
        _createTextCell(cell, value, field) {
            // 主キーフィールドの場合は値と分離ボタンを含むコンテナを作成
            if (field && field.isPrimaryKey) {
                this._createPrimaryKeyCell(cell, value, field);
            } else {
                cell.textContent = value || '';
            }
        }

        /**
         * 主キーセルを作成（値 + 分離ボタン）
         */
        _createPrimaryKeyCell(cell, value, field) {
            // コンテナ作成
            const container = document.createElement('div');
            container.classList.add('primary-key-container');

            // 値表示部分
            const valueSpan = document.createElement('span');
            valueSpan.textContent = value || '';
            valueSpan.classList.add('primary-key-value');

            // 分離ボタン
            const separateBtn = document.createElement('button');
            separateBtn.innerHTML = '✂️';
            separateBtn.title = `${field.label}を分離`;
            separateBtn.classList.add('separate-btn');

            // 値が空の場合はボタンを無効化
            const isEmpty = !value || value.trim() === '';
            if (isEmpty) {
                separateBtn.disabled = true;
                //separateBtn.style.opacity = '0.3';
                separateBtn.style.pointerEvents = 'none';
                separateBtn.title = '分離対象の値がないため無効';
            }

            // クリックイベント
            separateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleSeparateClick(cell, field, value);
            });

            container.appendChild(valueSpan);
            container.appendChild(separateBtn);
            cell.appendChild(container);
        }

        /**
         * 分離ボタンクリック処理
         */
        _handleSeparateClick(cell, field, value) {
            
            // 空の値の場合は処理を停止
            if (!value || value.trim() === '') {
                console.warn('⚠️ 分離対象の値が空です。分離処理をスキップします。');
                return;
            }
            
            // 行を取得
            const row = cell.closest('tr');
            if (!row) {
                return;
            }

            // 分離処理実行
            this._executeSeparation(row, field, value);
        }

        /**
         * 分離処理実行
         */
        _executeSeparation(row, field, value) {
            try {
                
                // 現在の統合キーを取得
                const integrationKey = row.getAttribute('data-integration-key');
                if (!integrationKey) {
                    throw new Error('統合キーが見つかりません');
                }

                // 統合キーを解析して分離対象を特定
                const keyParts = integrationKey.split('|');

                // 分離対象のフィールドを除いた新しい統合キーを作成
                const newKeyParts = keyParts.filter(part => {
                    if (!part.includes(':')) return false;
                    const [app, val] = part.split(':');
                    return !(field.sourceApp === app && val === value);
                });

                if (newKeyParts.length === keyParts.length) {
                    throw new Error('分離対象が見つかりません');
                }

                // 元の行を更新（分離対象を除去）
                const newIntegrationKey = newKeyParts.join('|');
                row.setAttribute('data-integration-key', newIntegrationKey);
                
                // 分離された項目用の新しい行を作成（元の行をクリアする前に）
                const separatedRow = this._createSeparatedRow(row, field, value, integrationKey);

                // 同じsourceAppのフィールドをすべて元の行からクリア
                this._clearFieldsFromOriginalRow(row, field.sourceApp);

                // 🎨 分離処理後のハイライト処理
                this._updateHighlightsAfterSeparation(row, separatedRow);

            } catch (error) {
                console.error('❌ 分離処理エラー:', error);
                alert(`分離処理中にエラーが発生しました: ${error.message}`);
            }
        }

        /**
         * 分離された行を作成
         */
        _createSeparatedRow(originalRow, separatedField, separatedValue, originalIntegrationKey) {
            // 新しい行を作成
            const newRow = originalRow.cloneNode(true);
            
            // 新しい統合キーを設定（分離されたフィールドのみ）
            const separatedIntegrationKey = `${separatedField.sourceApp}:${separatedValue}`;
            newRow.setAttribute('data-integration-key', separatedIntegrationKey);
            
            // 新しい行番号を取得（最大値管理から）
            const newRowNumber = dataManager.getNextRowNumber();
            
            // 実際の行番号をdata-row-idに設定（表示行番号ではない）
            newRow.setAttribute('data-row-id', newRowNumber);

            // 分離されたsourceApp以外のフィールドをクリアし、すべてのdata-original-valueを空にする
            this._setupSeparatedRow(newRow, separatedField, newRowNumber, originalRow);

            // 元の行の後に新しい行を挿入
            originalRow.parentNode.insertBefore(newRow, originalRow.nextSibling);
            
            // 🔄 分離行にドラッグ&ドロップ機能を設定
            this._setupDragAndDropForSeparatedRow(newRow);
            
            // 新しい行をハイライト
            // newRow.style.backgroundColor = '#e8f5e8';
            // setTimeout(() => {
            //     newRow.style.backgroundColor = '';
            // }, 3000);

            // 戻り値として分離行を返す
            return newRow;
        }

        /**
         * レコードURLを構築
         */
        _buildRecordUrl(record, field) {
            if (!field.sourceApp || !record.recordIds) {
                return '#';
            }

            const sourceApp = field.sourceApp;
            if (!window.LedgerV2.Config.APP_URL_MAPPINGS[sourceApp]) {
                return '#';
            }

            const appId = window.LedgerV2.Config.APP_IDS[sourceApp];
            const recordId = record.recordIds[sourceApp];

            if (!appId || !recordId) {
                return '#';
            }

            return window.LedgerV2.Config.APP_URL_MAPPINGS[sourceApp].replace('{appId}', appId).replace('{recordId}', recordId);
        }

        /**
         * 主キーが紐づいていない台帳フィールドにスタイルを適用
         * 🚨 PROTECTED: ②パターン（ページング時の直接input/select生成）で使用 - 削除禁止
         */
        _applyUnlinkedLedgerStyles(row, record) {
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
                    const primaryKeyValue = FieldValueProcessor.process(record, primaryKeyField, '');
                    
                    // 主キーが空の場合、その台帳の全フィールドにクラスを付与
                    if (!primaryKeyValue || primaryKeyValue.trim() === '') {
                        
                        // その台帳のすべてのフィールドセルにクラスを付与
                        const cells = row.querySelectorAll(`td[data-source-app="${sourceApp}"]`);
                        cells.forEach(cell => {
                            cell.classList.add('cell-unlinked-ledger');
                        });
                    }
                }
            });
        }

        /**
         * 入力幅クラスを取得
         * 🚨 PROTECTED: ②パターン（ページング時の直接input/select生成）で使用 - 削除禁止
         */
        _getInputWidthClass(fieldWidth) {
            const widthMap = {
                '68px': 'input-width-68',
                '78px': 'input-width-78',
                '98px': 'input-width-98'
            };
            return widthMap[fieldWidth] || null;
        }

        /**
         * 表示されたデータから最大行番号を設定
         */
        _setMaxRowNumberFromDisplayedData() {
            let maxRowNumber = 0;
            
            // ページングが有効で全データ数が取得できる場合
            if (window.paginationManager && window.paginationManager.allData && window.paginationManager.allData.length > 0) {
                maxRowNumber = window.paginationManager.allData.length;
            } 
            // currentDataから算出
            else if (this.currentData && this.currentData.length > 0) {
                maxRowNumber = this.currentData.length;
            }
            // 最後の手段：実際のテーブルから取得
            else {
                const tbody = DOMHelper.getTableBody();
                if (tbody) {
                    const rows = tbody.querySelectorAll('tr');
                    maxRowNumber = rows.length;
                }
            }

            dataManager.setMaxRowNumber(maxRowNumber);
        }

        /**
         * オートフィルタ機能を初期化
         */
        _initializeAutoFilter() {
            if (!window.LedgerV2?.AutoFilter?.AutoFilterManagerV2) {
                console.warn('⚠️ オートフィルタ機能が見つかりません');
                return;
            }

            try {
                // 既存のオートフィルタマネージャーがある場合はクリア
                if (window.autoFilterManager) {
                    window.autoFilterManager.clearAllFilters();
                }

                // 新しいオートフィルタマネージャーを作成
                window.autoFilterManager = new window.LedgerV2.AutoFilter.AutoFilterManagerV2();
                
                // 短い遅延後に初期化（DOM構築完了を確実にするため）
                setTimeout(() => {
                    if (window.autoFilterManager) {
                        window.autoFilterManager.initialize();
                    }
                }, 100);

            } catch (error) {
                console.error('❌ オートフィルタ初期化エラー:', error);
            }
        }

        /**
         * 元の行から指定されたsourceAppのフィールドをクリア
         */
        _clearFieldsFromOriginalRow(row, targetSourceApp) {
            const cells = row.querySelectorAll('td[data-field-code]');
            
            cells.forEach(cell => {
                const fieldCode = cell.getAttribute('data-field-code');
                const field = window.fieldsConfig.find(f => f.fieldCode === fieldCode);
                
                if (!field || field.sourceApp !== targetSourceApp) return;
                
                // 主キーフィールドの場合
                if (field.isPrimaryKey) {
                    const container = cell.querySelector('div');
                    if (container) {
                        const valueSpan = container.querySelector('span');
                        if (valueSpan) {
                            valueSpan.textContent = '';
                        }
                    } else {
                        cell.textContent = '';
                    }
                }
                // レコードIDフィールドの場合
                else if (field.isRecordId) {
                    cell.textContent = '';
                }
                // 通常フィールドの場合
                else {
                    const input = cell.querySelector('input, select');
                    if (input) {
                        input.value = '';
                    } else {
                        cell.textContent = '';
                    }
                }
            });
        }

        /**
         * 分離行を設定（指定されたsourceApp以外をクリア）
         */
        _setupSeparatedRow(newRow, separatedField, newRowNumber, originalRow) {
            if (!newRow || !separatedField || !originalRow) {
                console.error('❌ _setupSeparatedRow: 必要なパラメータが不足しています', { newRow, separatedField, originalRow });
                return;
            }

            const cells = newRow.querySelectorAll('td[data-field-code]');
            
            cells.forEach(cell => {
                if (!cell) {
                    console.warn('⚠️ _setupSeparatedRow: セルがnullです');
                    return;
                }
                const fieldCode = cell.getAttribute('data-field-code');
                const field = window.fieldsConfig.find(f => f.fieldCode === fieldCode);
                
                // すべてのセルのdata-original-valueを空にする
                cell.setAttribute('data-original-value', '');
                
                if (!field) return;

                // 行番号セルの場合は新しい番号を設定
                if (field.isRowNumber) {
                    cell.textContent = newRowNumber;
                    return;
                }

                // 分離されたsourceAppと異なるフィールドをクリア
                if (field.sourceApp && field.sourceApp !== separatedField.sourceApp) {
                    
                    // 主キーフィールドの場合
                    if (field.isPrimaryKey) {
                        const container = cell.querySelector('div');
                        if (container) {
                            const valueSpan = container.querySelector('span');
                            if (valueSpan) {
                                valueSpan.textContent = '';
                            }
                        } else {
                            cell.textContent = '';
                        }
                    }
                    // レコードIDフィールドの場合
                    else if (field.isRecordId) {
                        cell.textContent = '';
                    }
                    // 通常フィールドの場合
                    else {
                        const input = cell.querySelector('input, select');
                        if (input) {
                            input.value = '';
                        } else {
                            cell.textContent = '';
                        }
                    }
                } else if (field.sourceApp === separatedField.sourceApp) {
                    // 保持されるフィールドの値を元のレコードデータから取得
                    let currentValue = '';
                    
                    // 元の行のdata-integration-keyから元のレコードを特定
                    const originalIntegrationKey = newRow.getAttribute('data-integration-key')?.replace('_separated', '');
                    
                    // 🔧 元の行から直接値を取得（DOM検索不要）
                    const originalCell = originalRow.querySelector(`td[data-field-code="${fieldCode}"]`);
                    console.log('🔍 元セル検索結果:', {
                        fieldCode: fieldCode,
                        originalCellFound: !!originalCell,
                        cellSearchQuery: `td[data-field-code="${fieldCode}"]`
                    });
                    
                    if (originalCell) {
                        currentValue = this._getCellValue(originalCell, field);
                        console.log('🔍 元セル値取得結果:', {
                            fieldCode: fieldCode,
                            retrievedValue: currentValue,
                            cellInnerHTML: originalCell.innerHTML
                        });
                        } else {
                        console.log('❌ 元セルが見つかりません');
                    }
                    
                    // 🔧 分離先のセルに値を正しく設定
                    console.log('🔍 分離時の値設定デバッグ:', {
                        fieldCode: fieldCode,
                        sourceApp: field.sourceApp,
                        cellType: field.cellType,
                        currentValue: currentValue,
                        hasValue: !!currentValue
                    });
                    
                    if (currentValue) {
                        // 分離時専用の値設定（data-original-valueを空のまま保持）
                        this._setCellValueForSeparation(cell, currentValue, field);
                    } else {
                        console.log('⚠️ 分離時の値が空のため設定をスキップ');
                    }
                }
            });
        }

        /**
         * 分離行にドラッグ&ドロップ機能を設定（既存システム再利用）
         */
        _setupDragAndDropForSeparatedRow(newRow) {
            try {
                
                // 既存のCellSwapManagerを使用して行単位で設定
                if (window.LedgerV2 && window.LedgerV2.TableInteract && window.LedgerV2.TableInteract.cellSwapManager) {
                    window.LedgerV2.TableInteract.cellSwapManager.setupDragDropForRow(newRow);
                } else {
                    // フォールバック: 基本的なdraggable設定のみ
                    const primaryKeyCells = newRow.querySelectorAll('td[data-is-primary-key="true"]');
                    primaryKeyCells.forEach(cell => {
                        cell.draggable = true;
                    });
                }
                
            } catch (error) {
                console.error('❌ 分離行ドラッグ&ドロップ設定エラー:', error);
            }
        }

        /**
         * 分離処理後のハイライト処理（既存システム活用）
         */
        _updateHighlightsAfterSeparation(originalRow, separatedRow) {
            try {
                
                // CellStateManagerが利用可能な場合
                if (window.cellStateManager) {
                    // 両方の行の全フィールドを再評価
                    [originalRow, separatedRow].forEach((row, index) => {                        
                        this._updateRowHighlightWithCellStateManager(row);
                    });
                } else {
                    // フォールバック: data-original-value ベースの簡単なハイライト
                    [originalRow, separatedRow].forEach((row, index) => {
                        this._updateRowHighlightFallback(row);
                    });
                }
                
            } catch (error) {
                console.error('❌ 分離後ハイライト処理エラー:', error);
            }
        }

        /**
         * CellStateManagerを使用した行ハイライト更新
         */
        _updateRowHighlightWithCellStateManager(row) {
            if (!row || !window.cellStateManager) return;
            
            const cells = row.querySelectorAll('td[data-field-code]');
            
            cells.forEach(cell => {
                const fieldCode = cell.getAttribute('data-field-code');
                if (fieldCode) {
                    try {
                        // 既存の高機能ハイライト更新システムを活用
                        window.cellStateManager.updateHighlightState(row, fieldCode);
                    } catch (error) {
                        console.warn(`⚠️ CellStateManager更新失敗: ${fieldCode}`, error);
                    }
                }
            });
        }

        /**
         * フォールバック: data-original-value ベースのシンプルハイライト（共通ヘルパー使用）
         */
        _updateRowHighlightFallback(row) {
            if (!row) return;
            
            const cells = Array.from(row.querySelectorAll('td[data-field-code]'));
            
            // 共通ヘルパーで一括処理
            window.CommonHighlightHelper.updateMultipleCellsHighlight(cells);

        }

        /**
         * 🔧 input/select要素の値変更時のイベントハンドラを設定
         * 🚨 PROTECTED: ②パターン（ページング時の直接input/select生成）で使用 - 削除禁止
         */
        _attachCellModificationListeners(inputElement, cell, row) {
            const handleChange = () => {
                // セルハイライト状態を更新
                if (window.LedgerV2?.Utils?.CommonHighlightHelper?.updateCellAndRowHighlight) {
                    window.LedgerV2.Utils.CommonHighlightHelper.updateCellAndRowHighlight(cell, inputElement.value);
                } else {
                    // フォールバック：直接クラス追加
                    const originalValue = cell.getAttribute('data-original-value') || '';
                    const currentValue = inputElement.value || '';
                    
                    if (currentValue !== originalValue) {
                        cell.classList.add('cell-modified');
                        if (row) {
                            row.classList.add('row-modified');
                        }
                    } else {
                        cell.classList.remove('cell-modified');
                        // 行内の他のセルもチェック
                        if (row) {
                            const modifiedCells = row.querySelectorAll('.cell-modified');
                            if (modifiedCells.length === 0) {
                                row.classList.remove('row-modified');
                            }
                        }
                    }
                }
            };

            // input/changeイベント両方に対応
            inputElement.addEventListener('input', handleChange);
            inputElement.addEventListener('change', handleChange);
        }

        /**
         * 🔧 セルから値を取得するヘルパーメソッド
         */
        _getCellValue(cell, field) {
            if (!cell || !field) {
                console.log('🔍 _getCellValue: パラメータ不足', { cell: !!cell, field: !!field });
                return '';
            }

            try {
                console.log('🔍 _getCellValue開始:', {
                    fieldCode: field.fieldCode,
                    isPrimaryKey: field.isPrimaryKey,
                    isRecordId: field.isRecordId,
                    cellType: field.cellType,
                    cellHTML: cell.innerHTML
                });

                if (field.isPrimaryKey) {
                    const container = cell.querySelector('div');
                    if (container) {
                        const valueSpan = container.querySelector('span');
                        if (valueSpan) {
                            const value = valueSpan.textContent || '';
                            console.log('🔍 主キー値取得:', { fieldCode: field.fieldCode, value });
                            return value;
                        }
                    } else {
                        const value = cell.textContent || '';
                        console.log('🔍 主キー値取得(コンテナなし):', { fieldCode: field.fieldCode, value });
                        return value;
                    }
                } else if (field.isRecordId) {
                    const value = cell.textContent || '';
                    console.log('🔍 レコードID値取得:', { fieldCode: field.fieldCode, value });
                    return value;
                } else {
                    const input = cell.querySelector('input, select');
                    console.log('🔍 input/select要素検索:', {
                        fieldCode: field.fieldCode,
                        elementFound: !!input,
                        elementType: input?.tagName,
                        elementValue: input?.value,
                        dataOriginalValue: cell.getAttribute('data-original-value')
                    });
                    
                    if (input) {
                        let value = input.value || '';
                        
                        // 🔧 select要素の値が空の場合、data-original-value属性から取得
                        if (!value && input.tagName === 'SELECT') {
                            const originalValue = cell.getAttribute('data-original-value');
                            if (originalValue) {
                                console.log('🔍 select値が空のため、data-original-valueから取得:', {
                                    fieldCode: field.fieldCode,
                                    originalValue: originalValue
                                });
                                
                                // select要素の値も正しく設定する
                                input.value = originalValue;
                                value = originalValue;
                            }
                        }
                        
                        console.log('🔍 input/select値取得:', { fieldCode: field.fieldCode, value });
                        return value;
                    } else {
                        const value = cell.textContent || '';
                        console.log('🔍 テキスト値取得:', { fieldCode: field.fieldCode, value });
                        return value;
                    }
                }
            } catch (error) {
                console.warn('⚠️ セル値取得エラー:', error, { cell, field });
                return '';
            }
        }

        /**
         * 🔧 分離時専用：セルに値を設定（data-original-valueは空のまま保持）
         */
        _setCellValueForSeparation(cell, value, field) {
            if (!cell || !field) return false;

            try {
                // フィールドタイプに応じて適切に値を設定
                if (field.isPrimaryKey) {
                    const container = cell.querySelector('div');
                    if (container) {
                        const valueSpan = container.querySelector('span');
                        if (valueSpan) {
                            valueSpan.textContent = value;
                        }
                    } else {
                        cell.textContent = value;
                    }
                } else if (field.isRecordId) {
                    cell.textContent = value;
                } else if (field.cellType === 'select' || field.cellType === 'dropdown') {
                    // 🔧 ドロップダウンの場合：select要素に値を設定
                    const select = cell.querySelector('select');
                    if (select) {
                        select.value = value;
                        
                        // 値が正しく設定されているか確認し、なければオプションを追加
                        if (select.value !== value && value) {
                            const option = document.createElement('option');
                            option.value = value;
                            option.textContent = value;
                            option.selected = true;
                            select.appendChild(option);
                        }
                    } else {
                        cell.textContent = value;
                    }
                } else if (field.cellType === 'input') {
                    // 🔧 inputの場合：input要素に値を設定
                    const input = cell.querySelector('input');
                    if (input) {
                        input.value = value;
                    } else {
                        cell.textContent = value;
                    }
                } else {
                    // テキストセルの場合
                    cell.textContent = value;
                }
                
                // 🔧 分離時はdata-original-valueを空のまま保持（cell-modified判定のため）
                // cell.setAttribute('data-original-value', value); ← これをしない
                console.log('✅ 分離時セル値設定完了:', {
                    fieldCode: field.fieldCode,
                    value: value,
                    dataOriginalValue: cell.getAttribute('data-original-value') || '(empty)'
                });
                
                return true;
                
            } catch (error) {
                console.error('❌ 分離時セル値設定エラー:', error, { cell, value, field });
                return false;
            }
        }

        /**
         * 🔧 セルに値を正しく設定するヘルパーメソッド
         */
        _setCellValue(cell, value, field) {
            if (!cell || !field) return false;

            try {
                // フィールドタイプに応じて適切に値を設定
                if (field.isPrimaryKey) {
                    const container = cell.querySelector('div');
                    if (container) {
                        const valueSpan = container.querySelector('span');
                        if (valueSpan) {
                            valueSpan.textContent = value;
                        }
                    } else {
                        cell.textContent = value;
                    }
                } else if (field.isRecordId) {
                    cell.textContent = value;
                } else if (field.cellType === 'select' || field.cellType === 'dropdown') {
                    // 🔧 ドロップダウンの場合：select要素に値を設定
                    const select = cell.querySelector('select');
                    console.log('🔍 Select要素設定デバッグ:', {
                        fieldCode: field.fieldCode,
                        cellType: field.cellType,
                        value: value,
                        selectElement: !!select,
                        currentSelectValue: select?.value,
                        selectOptions: select ? Array.from(select.options).map(opt => opt.value) : []
                    });
                    
                    if (select) {
                        // 一旦値を設定してみる
                        select.value = value;
                        
                        // 値が正しく設定されているか確認
                        if (select.value !== value && value) {
                            console.log('⚠️ Select値設定失敗、オプションを追加:', {
                                targetValue: value,
                                currentValue: select.value,
                                existingOptions: Array.from(select.options).map(opt => opt.value)
                            });
                            
                            // 新しいオプションを追加
                            const option = document.createElement('option');
                            option.value = value;
                            option.textContent = value;
                            option.selected = true;
                            select.appendChild(option);
                            
                            // 再度確認
                            console.log('✅ オプション追加後のSelect値:', select.value);
                        } else {
                            console.log('✅ Select値設定成功:', select.value);
                        }
                    } else {
                        console.log('⚠️ Select要素が見つからないため、テキストとして設定');
                        cell.textContent = value;
                    }
                } else if (field.cellType === 'input') {
                    // 🔧 inputの場合：input要素に値を設定
                    const input = cell.querySelector('input');
                    if (input) {
                        input.value = value;
                    } else {
                        cell.textContent = value;
                    }
                } else {
                    // テキストセルの場合
                    cell.textContent = value;
                }
                
                // data-original-valueも更新（分離後のハイライト制御用）
                cell.setAttribute('data-original-value', value);
                
                return true;
                
            } catch (error) {
                console.error('❌ セル値設定エラー:', error, { cell, value, field });
                return false;
            }
        }

 
    }

    // =============================================================================
    // グローバル公開
    // =============================================================================

    window.LedgerV2.TableRender = { 
        TableDisplayManager
    };
    
    window.TableDisplayManager = TableDisplayManager;

})(); 