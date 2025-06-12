/*!
 * 📊 統合台帳システムv2 - テーブル初期化・ヘッダー管理機能
 * 🎯 システム初期化・テーブル作成・ヘッダーボタン専用モジュール
 * 
 * ✅ **責任範囲**
 * ✅ システム初期化・起動制御（AutoInitializer）
 * ✅ テーブル作成・DOM構築（createProfessionalTable）
 * ✅ ヘッダーボタン管理（検索・クリア）
 * ✅ フィルター条件管理・初期メッセージ表示
 * ✅ 依存関係チェック・システム準備待機
 * 
 * ❌ **やってはいけないこと（責任範囲外）**
 * ❌ テーブル描画・データ表示（table-render.jsの責任）
 * ❌ ページネーション処理（table-pagination.jsの責任）
 * ❌ ユーザーインタラクション（table-interact.jsの責任）
 * ❌ API通信・データ統合（core.jsの責任）
 * 
 * 📦 **含まれるクラス**
 * - AutoInitializer: システム自動初期化管理
 * - HeaderButtonManager: ヘッダーボタン・検索機能管理
 * 
 * 🔗 **依存関係**
 * - LoadingManager (ローディング表示)
 * - window.LedgerV2.TableRender.TableDisplayManager (描画)
 * - window.LedgerV2.TableInteract.tableEventManager (イベント)
 * - window.searchManager (検索機能)
 * - window.dataManager (データ管理)
 * - window.fieldsConfig (フィールド設定)
 */
(function() {
    'use strict';

    // グローバル名前空間確保
    window.LedgerV2 = window.LedgerV2 || {};
    window.LedgerV2.TableHeader = {};



    // =============================================================================
    // テーブル作成（ヘッダー・検索行のみ）
    // =============================================================================

    class TableCreator {
        /**
         * テーブル作成（ヘッダー・検索行のみ、データ読み込みなし）
         */
        static async createTable() {

            try {
                // システム準備完了まで待機
                await this._waitForSystemReady();

                // テーブル構造作成
                await this._createTableStructure();

            } catch (error) {
                console.error('❌ テーブル作成エラー:', error);
                throw error;
            }
        }

        /**
         * システム準備完了まで待機（プライベートメソッド）
         */
        static async _waitForSystemReady() {
            // 必要なシステムコンポーネントの存在をチェック
            if (!window.LedgerV2?.Config?.APP_IDS) {
                throw new Error('LedgerV2 Config が見つかりません');
            }
            if (!window.fieldsConfig) {
                throw new Error('fieldsConfig が見つかりません');
            }
            if (!window.searchManager) {
                throw new Error('searchManager が見つかりません');
            }
            if (!window.dataManager) {
                throw new Error('dataManager が見つかりません');
            }

        }

        /**
         * テーブルDOM構造作成（プライベートメソッド）
         */
        static async _createTableStructure() {
            // HTMLで既にテーブル構造が定義されているので、ヘッダー行を追加するだけ
            const thead = document.querySelector('#my-thead');
            
            // カテゴリー行とヘッダー行が存在しない場合は追加
            if (!document.querySelector('#my-category-row')) {
                const categoryRow = document.createElement('tr');
                categoryRow.id = 'my-category-row';
                categoryRow.classList.add('category-row');
                thead.insertBefore(categoryRow, thead.firstChild);
            }
            
            // if (!document.querySelector('#my-header-row')) {
            //     const headerRow = document.createElement('tr');
            //     headerRow.id = 'my-header-row';
            //     headerRow.classList.add('header-row');
            //     const filterRow = document.querySelector('#my-filter-row');
            //     thead.insertBefore(headerRow, filterRow);
            // }

            // ヘッダー行を作成
            this._createCategoryRow();
            // this._createHeaderRow();
            this._createFilterRow();

            // ヘッダーボタン初期化
            HeaderButtonManager.initializeHeaderButtons();

            // テーブルイベント初期化
            if (window.LedgerV2?.TableInteract?.tableEventManager) {
                window.LedgerV2.TableInteract.tableEventManager.initializeTableEvents();
            }

            // フィルタ入力にEnterキーイベントを追加
            this._initializeFilterKeyEvents();
        }

        /**
         * カテゴリー行を作成（1行目）
         */
        static _createCategoryRow() {
            const categoryRow = document.querySelector('#my-category-row');
            categoryRow.innerHTML = '';

            const categorySpans = this._calculateCategorySpans();
            categorySpans.forEach(categoryInfo => {
                const th = document.createElement('th');
                th.classList.add('table-header', 'category-header');
                th.setAttribute('colspan', categoryInfo.span);
                th.textContent = categoryInfo.category;
                th.style.textAlign = 'center'; // 中央揃え
                
                // カテゴリー内にisHiddenFromUser: trueのフィールドがすべて含まれる場合のみクラスを追加
                const allFieldsHidden = categoryInfo.fields.every(field => field.isHiddenFromUser);
                if (allFieldsHidden) {
                    th.classList.add('header-hidden-from-user');
                }
                
                const totalWidth = categoryInfo.fields.reduce((sum, field) => {
                    const width = parseInt(field.width) || 120;
                    return sum + width;
                }, 0);
                th.style.width = `${totalWidth}px`;
                
                categoryRow.appendChild(th);
            });
        }

        /**
         * ヘッダーラベル行を作成（2行目）
         */
        // static _createHeaderRow() {
        //     const headerRow = document.querySelector('#my-header-row');
        //     headerRow.innerHTML = '';

        //     window.fieldsConfig.forEach(field => {
        //         const th = document.createElement('th');
        //         th.classList.add('table-header', 'label-header');
                
        //         if (field.isHiddenFromUser) {
        //             th.classList.add('header-hidden-from-user');
        //         }
                
        //         th.style.width = field.width || '120px';
        //         th.innerHTML = `<div class="header-label">${field.label}</div>`;
        //         headerRow.appendChild(th);
        //     });
        // }

        /**
         * フィルター行を作成（3行目）
         */
        static _createFilterRow() {
            const filterRow = document.querySelector('#my-filter-row');
            filterRow.innerHTML = '';

            window.fieldsConfig.forEach(field => {
                const th = document.createElement('th');
                const headerColorClass = field.sourceApp ? {
                    'SEAT': 'header-seat',
                    'PC': 'header-pc',
                    'EXT': 'header-ext',
                    'USER': 'header-user'
                }[field.sourceApp] || 'header-common' : 'header-common';

                th.classList.add('table-header', headerColorClass);
                
                if (field.isHiddenFromUser) {
                    th.classList.add('header-hidden-from-user');
                }
                
                th.style.width = field.width || '120px';
                th.innerHTML = this._createFilterElement(field);
                filterRow.appendChild(th);
            });
        }

        /**
         * カテゴリーごとのセル結合情報を計算
         */
        static _calculateCategorySpans() {
            const categorySpans = [];
            let currentCategory = null;
            let currentSpan = 0;
            let currentFields = [];

            window.fieldsConfig.forEach((field, index) => {
                if (field.category !== currentCategory) {
                    // 前のカテゴリーがある場合は結果に追加
                    if (currentCategory !== null) {
                        categorySpans.push({
                            category: currentCategory,
                            span: currentSpan,
                            fields: [...currentFields]
                        });
                    }
                    
                    // 新しいカテゴリーを開始
                    currentCategory = field.category;
                    currentSpan = 1;
                    currentFields = [field];
                } else {
                    // 同じカテゴリーの場合はスパンを増加
                    currentSpan++;
                    currentFields.push(field);
                }
            });

            // 最後のカテゴリーを追加
            if (currentCategory !== null) {
                categorySpans.push({
                    category: currentCategory,
                    span: currentSpan,
                    fields: [...currentFields]
                });
            }

            return categorySpans;
        }

        /**
         * フィルタ入力フィールドにキーイベントを設定
         */
        static _initializeFilterKeyEvents() {
            // DOMが完全に構築された後に実行
            setTimeout(() => {
                const filterInputs = document.querySelectorAll('#my-filter-row input[type="text"]');
                
                filterInputs.forEach(input => {
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault(); // デフォルトの動作を防ぐ
                            HeaderButtonManager.executeSearch();
                        }
                    });
                });
            }, 100); // テーブル構築完了を待つ
        }

        /**
         * フィールド設定に基づいてフィルター要素を作成
         */
        static _createFilterElement(field) {
            const headerLabel = `<div class="header-label">${field.label}</div>`;
            
            // filterType に基づいて適切なUI要素を選択
            const filterType = field.filterType || 'text';

            switch (filterType) {
                case 'dropdown':
                    return this._createSelectElement(field, headerLabel);
                
                case 'text':
                default:
                    return this._createInputElement(field, headerLabel);
            }
        }

        /**
         * セレクトボックス要素を作成（DROPDOWN filterType用）
         */
        static _createSelectElement(field, headerLabel) {
            if (!field.options || !Array.isArray(field.options)) {
                console.warn(`⚠️ フィールド "${field.fieldCode}" にoptionsが設定されていません`);
                return this._createInputElement(field, headerLabel); // フォールバック
            }

            // optionsの形式を統一（文字列 or オブジェクト対応）
            const optionsHtml = field.options.map(option => {
                const value = typeof option === 'object' ? option.value : option;
                const label = typeof option === 'object' ? option.label : option;
                return `<option value="${value}">${label}</option>`;
            }).join('');

            return `
                ${headerLabel}
                <select class="filter-input" data-field="${field.fieldCode}" data-field-code="${field.fieldCode}">
                    <option value="">すべて</option>
                    ${optionsHtml}
                </select>
            `;
        }

        /**
         * インプット要素を作成（TEXT filterType用）
         */
        static _createInputElement(field, headerLabel) {
            return `
                ${headerLabel}
                <input type="text" class="filter-input" 
                       placeholder="${field.placeholder || ''}" 
                       data-field="${field.fieldCode}" 
                       data-field-code="${field.fieldCode}">
            `;
        }
    }

    // =============================================================================
    // ヘッダーボタン管理
    // =============================================================================

    class HeaderButtonManager {
        static initializeHeaderButtons() {
            // kintoneの適切なヘッダーメニュースペースを取得
            const headerSpace = kintone.app.getHeaderMenuSpaceElement();
            
            // 既存のボタンコンテナをクリア
            const existingContainer = headerSpace.querySelector('.ledger-search-buttons');
            if (existingContainer) {
                existingContainer.remove();
            }

            // ボタンコンテナを作成
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'ledger-search-buttons';
            buttonContainer.style.cssText = `
                display: inline-flex;
                gap: 8px;
                align-items: center;
                margin-left: 10px;
                flex-wrap: wrap;
                transition: all 0.3s ease;
            `;

            // 🎨 レスポンシブ対応のCSS追加
            this._addResponsiveStyles();

            this.createSearchButtons(buttonContainer);
            headerSpace.appendChild(buttonContainer);
        }

        // 🎨 レスポンシブスタイルを追加
        static _addResponsiveStyles() {
            const styleId = 'ledger-responsive-buttons';
            if (document.getElementById(styleId)) return;

            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* デスクトップ表示 */
                @media (min-width: 1024px) {
                    .ledger-search-buttons .button-group {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                /* タブレット表示 */
                @media (max-width: 1023px) and (min-width: 768px) {
                    .ledger-search-buttons {
                        gap: 6px !important;
                    }
                    .ledger-search-buttons .button-group {
                        padding: 3px !important;
                        margin-right: 8px !important;
                    }
                    .ledger-search-buttons button {
                        padding: 5px 10px !important;
                        font-size: 12px !important;
                    }
                    .ledger-search-buttons button span:last-child {
                        display: none;
                    }
                }

                /* モバイル表示 */
                @media (max-width: 767px) {
                    .ledger-search-buttons {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 4px !important;
                        width: 100% !important;
                        margin-left: 0 !important;
                    }
                    .ledger-search-buttons .button-group {
                        justify-content: center !important;
                        margin-right: 0 !important;
                        margin-bottom: 4px !important;
                    }
                    .ledger-search-buttons button {
                        padding: 8px 12px !important;
                        font-size: 12px !important;
                        min-width: 80px !important;
                    }
                }

                /* フォーカス時のアクセシビリティ */
                .ledger-search-buttons button:focus {
                    outline: 2px solid #007bff;
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(style);
        }



        static createSearchButtons(container) {
            // 🎨 パステル系の柔らかく優しい色合い
            const BUTTON_STYLES = {
                base: `
                    border: 1px solid #ddd;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    margin-right: 6px;
                `,
                // 検索系：柔らかいパステルブルー
                search: `background: #74b9ff; color: white; border-color: #74b9ff;`,
                searchHover: '#5a9cff',
                
                // 管理系：柔らかいパステルパープル
                manage: `background: #a29bfe; color: white; border-color: #a29bfe;`,
                manageHover: '#8b7efe',
                
                // モード系：柔らかいパステルピンク
                mode: `background: #fd79a8; color: white; border-color: #fd79a8;`,
                modeHover: '#fc5c8a'
            };

            // 🔍 検索グループ
            const searchGroup = document.createElement('div');
            searchGroup.className = 'button-group search-group';
            searchGroup.style.cssText = `
                display: inline-flex;
                gap: 4px;
                margin-right: 12px;
                padding: 4px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
            `;

            // 🔍 検索ボタン
            const searchBtn = document.createElement('button');
            searchBtn.innerHTML = '<span>🔍</span><span>検索</span>';
            searchBtn.className = 'ledger-search-btn';
            searchBtn.style.cssText = BUTTON_STYLES.base + BUTTON_STYLES.search;
            searchBtn.addEventListener('click', () => this.executeSearch());
            this._addSimpleHoverEffect(searchBtn, BUTTON_STYLES.searchHover);

            // 📝 追加検索ボタン
            const appendBtn = document.createElement('button');
            appendBtn.innerHTML = '<span>➕</span><span>追加</span>';
            appendBtn.className = 'ledger-append-btn';
            appendBtn.style.cssText = BUTTON_STYLES.base + BUTTON_STYLES.search;
            appendBtn.addEventListener('click', () => this.executeAppendSearch());
            this._addSimpleHoverEffect(appendBtn, BUTTON_STYLES.searchHover);

            // 🧹 クリアボタン
            const clearBtn = document.createElement('button');
            clearBtn.innerHTML = '<span>🗑️</span><span>クリア</span>';
            clearBtn.className = 'ledger-clear-btn';
            clearBtn.style.cssText = BUTTON_STYLES.base + BUTTON_STYLES.search;
            clearBtn.addEventListener('click', () => this.clearAllFilters());
            this._addSimpleHoverEffect(clearBtn, BUTTON_STYLES.searchHover);

            searchGroup.appendChild(searchBtn);
            searchGroup.appendChild(appendBtn);
            searchGroup.appendChild(clearBtn);

            // 📊 管理グループ
            const manageGroup = document.createElement('div');
            manageGroup.className = 'button-group manage-group';
            manageGroup.style.cssText = `
                display: inline-flex;
                gap: 4px;
                margin-right: 12px;
                padding: 4px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
            `;

            // 🆕 新規行追加ボタン
            const addRecordBtn = document.createElement('button');
            addRecordBtn.innerHTML = '<span>➕</span><span>新規</span>';
            addRecordBtn.className = 'ledger-add-record-btn';
            addRecordBtn.style.cssText = BUTTON_STYLES.base + BUTTON_STYLES.manage;
            addRecordBtn.addEventListener('click', () => this.openAddRecordDialog());
            this._addSimpleHoverEffect(addRecordBtn, BUTTON_STYLES.manageHover);

            // 💾 データ更新ボタン
            const updateBtn = document.createElement('button');
            updateBtn.innerHTML = '<span>💾</span><span>更新</span>';
            updateBtn.className = 'ledger-update-btn';
            updateBtn.style.cssText = BUTTON_STYLES.base + BUTTON_STYLES.manage;
            updateBtn.addEventListener('click', () => this.executeDataUpdate());
            this._addSimpleHoverEffect(updateBtn, BUTTON_STYLES.manageHover);

            manageGroup.appendChild(addRecordBtn);
            manageGroup.appendChild(updateBtn);

            // 🎯 モードグループ
            const modeGroup = document.createElement('div');
            modeGroup.className = 'button-group mode-group';
            modeGroup.style.cssText = `
                display: inline-flex;
                gap: 4px;
                padding: 4px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
            `;

            // 🎯 編集モード切り替えボタン
            const editModeBtn = document.createElement('button');
            editModeBtn.innerHTML = '<span>🔒</span><span>編集モード</span>';
            editModeBtn.id = 'edit-mode-toggle-btn';
            editModeBtn.className = 'ledger-edit-mode-btn';
            editModeBtn.style.cssText = BUTTON_STYLES.base + BUTTON_STYLES.mode;
            
            // 編集モード切り替え機能
            editModeBtn.addEventListener('click', () => this.toggleEditMode(editModeBtn));
            
            // 初期状態は閲覧モード
            this.updateEditModeButton(editModeBtn, false);

            modeGroup.appendChild(editModeBtn);

            // グループをコンテナに追加
            container.appendChild(searchGroup);
            container.appendChild(manageGroup);
            container.appendChild(modeGroup);
        }

        // 🎨 シンプルなホバーエフェクト
        static _addSimpleHoverEffect(button, hoverColor) {
            const originalBg = button.style.background;
            button.addEventListener('mouseenter', () => {
                button.style.background = hoverColor;
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = originalBg;
            });
        }

        // 🆕 編集モード切り替え処理
        static toggleEditMode(button) {
            if (!window.editModeManager) {
                console.error('❌ editModeManagerが初期化されていません');
                return;
            }

            const isCurrentlyEditMode = window.editModeManager.isEditMode;
            
            if (isCurrentlyEditMode) {
                // 編集モード → 閲覧モード
                window.editModeManager.disableEditMode();
                document.body.classList.remove('edit-mode-active');
                document.body.classList.add('view-mode-active');
                this.updateEditModeButton(button, false);
            } else {
                // 閲覧モード → 編集モード
                window.editModeManager.enableEditMode();
                document.body.classList.remove('view-mode-active');
                document.body.classList.add('edit-mode-active');
                this.updateEditModeButton(button, true);
            }
            
            // 切り替え成功のアニメーション
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 150);
        }

        // 🆕 編集モードボタンの表示更新
        static updateEditModeButton(button, isEditMode) {
            if (isEditMode) {
                button.innerHTML = '<span>👁️</span><span>閲覧モード</span>';
                button.style.background = '#ff7675'; // パステル系の明るいピンク
                button.style.color = 'white';
                button.style.borderColor = '#ff7675';
            } else {
                button.innerHTML = '<span>🔒</span><span>編集モード</span>';
                button.style.background = '#fd79a8'; // パステル系の基本ピンク
                button.style.color = 'white';
                button.style.borderColor = '#fd79a8';
            }
        }

        // 🆕 新規レコード追加ダイアログを開く
        static openAddRecordDialog() {
            try {
                // 必要なリソースがロードされているかチェック
                if (!window.LedgerV2 || !window.LedgerV2.Modal || !window.LedgerV2.Modal.AddRecordModal) {
                    console.error('❌ AddRecordModalが見つかりません。modal-add-record.jsが読み込まれているか確認してください。');
                    alert('新規レコード追加機能が利用できません。ページを再読み込みしてください。');
                    return;
                }

                // 新規レコード追加モーダルを表示
                const addRecordModal = new window.LedgerV2.Modal.AddRecordModal();
                addRecordModal.show();

            } catch (error) {
                console.error('❌ 新規レコード追加ダイアログ表示エラー:', error);
                alert('新規レコード追加ダイアログの表示中にエラーが発生しました。');
            }
        }

        static async executeSearch() {
            try {
                
                // 🚫 無条件検索チェック
                if (!this._validateSearchConditions()) {
                    this._showNoConditionError();
                    return;
                }

                LoadingManager.show('検索中...');

                // 通常検索（追加モードを無効化）
                window.dataManager.setAppendMode(false);

                const result = await window.searchManager.executeSearch('manual', null);

                if (result && result.integratedRecords) {
                    // table-render.jsのTableDisplayManagerを使用
                    const tableManager = new window.LedgerV2.TableRender.TableDisplayManager();
                    tableManager.displayIntegratedData(result.integratedRecords);
                }

                LoadingManager.hide();
            } catch (error) {
                LoadingManager.hide();
                console.error('❌ 検索エラー:', error);
            }
        }

        static async executeAppendSearch() {
            try {
                
                // 🚫 無条件検索チェック
                if (!this._validateSearchConditions()) {
                    this._showNoConditionError();
                    return;
                }

                LoadingManager.show('追加検索中...');

                // 追加モードを有効化
                window.dataManager.setAppendMode(true);

                const result = await window.searchManager.executeSearch('manual', null);

                if (result && result.integratedRecords) {
                    // table-render.jsのTableDisplayManagerを使用
                    const tableManager = new window.LedgerV2.TableRender.TableDisplayManager();
                    tableManager.displayIntegratedData(result.integratedRecords);
                }

                LoadingManager.hide();
            } catch (error) {
                LoadingManager.hide();
                console.error('❌ 追加検索エラー:', error);
            }
        }

        static clearAllFilters() {
            const filterInputs = document.querySelectorAll('#my-filter-row input, #my-filter-row select');
            filterInputs.forEach(input => {
                input.value = '';
            });

            // SearchManagerのclearFilters()も呼び出してエラーメッセージをクリア
            if (window.searchManager && window.searchManager.clearFilters) {
                window.searchManager.clearFilters();
            }

            // 追加モードを無効化し、行番号をリセット
            window.dataManager.setAppendMode(false);
            window.dataManager.resetRowCounter();

            // ページネーションをクリア
            if (window.paginationManager) {
                window.paginationManager.setAllData([]);
            }
            if (window.paginationUI) {
                window.paginationUI._removePaginationUI();
            }

            // テーブルをクリア
            dataManager.clearTable();
        }

        // 💾 データ更新実行（モーダル対応版）
        static async executeDataUpdate() {
            try {
                
                // CSSとJSファイルをロード（まだロードされていない場合）
                await this._loadModalResources();
                
                // チェックされた行を取得
                const checkedRows = this._getCheckedRows();
                
                if (checkedRows.length === 0) {
                    const noDataModal = new window.LedgerV2.Modal.ResultModal();
                    await noDataModal.show({
                        SYSTEM: { success: false, recordCount: 0, error: '更新対象の行が選択されていません。チェックボックスにチェックを入れてください。' }
                    }, 0);
                    return;
                }
                
                // 各行のデータを4つの台帳に分解
                const ledgerDataSets = this._decomposeTo4Ledgers(checkedRows);
                
                // kintone用のupsertボディを作成
                const updateBodies = this._createUpdateBodies(ledgerDataSets);
                
                // 確認モーダルを表示
                const confirmModal = new window.LedgerV2.Modal.UpdateConfirmModal();
                const confirmed = await confirmModal.show(checkedRows, ledgerDataSets, updateBodies);
                
                if (!confirmed) {
                    return;
                }
                
                // 進捗モーダルを表示
                const progressModal = new window.LedgerV2.Modal.ProgressModal();
                const totalSteps = Object.keys(updateBodies).length;
                progressModal.show(totalSteps);
                
                // 実際のAPI呼び出し
                const updateResults = {};
                let currentStep = 0;
                
                for (const [ledgerType, body] of Object.entries(updateBodies)) {
                    if (body.records.length > 0) {
                        try {
                            currentStep++;
                            const ledgerName = this._getLedgerName(ledgerType);
                            progressModal.updateProgress(currentStep, totalSteps, `${ledgerName}を更新中... (${body.records.length}件)`);
                            
                            const response = await kintone.api('/k/v1/records', 'PUT', body);
                            
                            updateResults[ledgerType] = {
                                success: true,
                                recordCount: body.records.length,
                                response: response
                            };
                            
                        } catch (error) {
                            updateResults[ledgerType] = {
                                success: false,
                                recordCount: body.records.length,
                                error: error.message || error
                            };
                            
                            console.error(`❌ ${ledgerType}台帳更新エラー:`, error);
                        }
                    }
                }
                
                // 進捗モーダルを閉じる
                progressModal.close();
                
                // 結果モーダルを表示
                const resultModal = new window.LedgerV2.Modal.ResultModal();
                await resultModal.show(updateResults, checkedRows.length);
                
                // 更新が全て成功した場合、チェックボックスをすべてOFFにする
                const allSuccess = Object.values(updateResults).every(result => result.success);
                if (allSuccess) {
                    this._uncheckAllModificationCheckboxes();
                }
                
            } catch (error) {
                console.error('❌ データ更新エラー:', error);
                
                // エラーモーダルを表示
                const errorModal = new window.LedgerV2.Modal.ResultModal();
                await errorModal.show({
                    SYSTEM: { success: false, recordCount: 0, error: error.message || 'システムエラーが発生しました' }
                }, 0);
            }
        }
        
        // チェックされた行を取得
        static _getCheckedRows() {
            const tbody = document.querySelector('#my-tbody');
            if (!tbody) return [];
            
            const rows = Array.from(tbody.querySelectorAll('tr[data-integration-key]'));
            const checkedRows = rows.filter(row => {
                const checkbox = row.querySelector('td[data-field-code="_modification_checkbox"] input[type="checkbox"]');
                return checkbox && checkbox.checked;
            });

            return checkedRows;
        }
        
        // 各行のデータを4つの台帳に分解
        static _decomposeTo4Ledgers(rows) {
            const ledgerDataSets = {
                SEAT: [],
                PC: [],
                EXT: [],
                USER: []
            };
            
            rows.forEach((row, index) => {
                
                const integrationKey = row.getAttribute('data-integration-key');
                const cells = row.querySelectorAll('td[data-field-code]');
                
                // 行のデータを収集
                const rowData = {
                    integrationKey,
                    fields: {}
                };
                
                cells.forEach(cell => {
                    const fieldCode = cell.getAttribute('data-field-code');
                    if (!fieldCode || fieldCode.startsWith('_')) return; // システムフィールドはスキップ
                    
                    const value = this._extractCellValue(cell);
                    rowData.fields[fieldCode] = value;
                });
                
                // 4つの台帳にデータを振り分け
                Object.keys(ledgerDataSets).forEach(ledgerType => {
                    const ledgerData = this._extractLedgerData(rowData, ledgerType);
                    if (ledgerData) {
                        ledgerDataSets[ledgerType].push(ledgerData);
                    }
                });
            });
            
            return ledgerDataSets;
        }
        
        // セルから値を抽出
        static _extractCellValue(cell) {
            // 入力要素がある場合
            const input = cell.querySelector('input, select, textarea');
            if (input) {
                return input.value || '';
            }
            
            // 主キー値スパンがある場合
            const primaryKeyValue = cell.querySelector('.primary-key-value');
            if (primaryKeyValue) {
                return primaryKeyValue.textContent.trim() || '';
            }
            
            // 通常のテキストセル（分離ボタン絵文字を除外）
            const textContent = cell.textContent || '';
            return textContent.replace(/✂️/g, '').trim();
        }
        
        // 特定の台帳用のデータを抽出
        static _extractLedgerData(rowData, ledgerType) {
            const recordIdField = `${ledgerType.toLowerCase()}_record_id`;
            const recordIdValue = rowData.fields[recordIdField];
            
            // レコードIDがない場合はスキップ
            if (!recordIdValue) {
                return null;
            }
            
            const ledgerRecord = {
                id: parseInt(recordIdValue),
                fields: {}
            };
            
            // 全主キーは全台帳に含める（空文字でも更新）
            const primaryKeys = window.LedgerV2.Utils.FieldValueProcessor.getAllPrimaryKeyFields();
            primaryKeys.forEach(primaryKey => {
                const fieldValue = rowData.fields[primaryKey];
                if (fieldValue !== undefined) {
                    ledgerRecord.fields[primaryKey] = fieldValue || ''; // 空文字も含める
                }
            });
            
            // その台帳固有のフィールドを追加（主キーとxxx_record_idは除外）
            const ledgerSpecificFields = window.fieldsConfig.filter(field => 
                field.sourceApp === ledgerType && 
                !field.isPrimaryKey && 
                !field.isRecordId &&
                !field.fieldCode.endsWith('_record_id')
            );
            
            ledgerSpecificFields.forEach(field => {
                const fieldValue = rowData.fields[field.fieldCode];
                if (fieldValue !== undefined) {
                    ledgerRecord.fields[field.fieldCode] = fieldValue || ''; // 空文字も含める
                }
            });
            
            // 主キーまたは台帳固有フィールドが存在する場合のみ返す
            if (Object.keys(ledgerRecord.fields).length > 0) {
                return ledgerRecord;
            }
            
            return null;
        }
        
        // kintone用のupsertボディを作成
        static _createUpdateBodies(ledgerDataSets) {
            const updateBodies = {};
            
            Object.entries(ledgerDataSets).forEach(([ledgerType, records]) => {
                if (records.length === 0) return;
                
                const appId = window.LedgerV2.Config.APP_IDS[ledgerType];
                if (!appId) {
                    console.warn(`⚠️ ${ledgerType}台帳のappIdが見つかりません`);
                    return;
                }
                
                updateBodies[ledgerType] = {
                    app: appId,
                    upsert: true,
                    records: records.map(record => ({
                        id: record.id,
                        record: this._convertToKintoneFormat(record.fields)
                    }))
                };

            });
            
            return updateBodies;
        }
        
        // フィールドデータをkintone形式に変換
        static _convertToKintoneFormat(fields) {
            const kintoneRecord = {};
            
            Object.entries(fields).forEach(([fieldCode, value]) => {
                kintoneRecord[fieldCode] = {
                    value: value
                };
            });
            
            return kintoneRecord;
        }
        
        // 更新成功後にすべてのチェックボックスをOFFにする
        static _uncheckAllModificationCheckboxes() {
            const tbody = document.querySelector('#my-tbody');
            if (!tbody) return;
            
            const checkboxes = tbody.querySelectorAll('td[data-field-code="_modification_checkbox"] input[type="checkbox"]');
            let uncheckedCount = 0;
            
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    checkbox.checked = false;
                    uncheckedCount++;
                    
                    // 対応する行からrow-modifiedクラスも削除
                    const row = checkbox.closest('tr');
                    if (row) {
                        row.classList.remove('row-modified');
                    }
                }
            });

        }

        // モーダル用リソースをロード
        static async _loadModalResources() {
            // マニフェストで読み込み済みの場合は何もしない
            if (window.LedgerV2 && window.LedgerV2.Modal) {
                return;
            }

            // JSファイルを動的読み込み（開発時のフォールバック）
            if (!window.LedgerV2 || !window.LedgerV2.Modal) {
                const script = document.createElement('script');
                script.src = './v2/modal-manager.js';
                document.head.appendChild(script);
                
                await new Promise((resolve) => {
                    script.onload = resolve;
                    script.onerror = () => {
                        console.error('❌ modal-manager.js の動的読み込みに失敗しました');
                        resolve();
                    };
                });
            }
        }

        // 台帳名を取得（モーダル用）
        static _getLedgerName(ledgerType) {
            return window.LedgerV2.Utils.FieldValueProcessor.getLedgerNameByApp(ledgerType);
        }

        // 🚫 検索条件バリデーション
        static _validateSearchConditions() {
            const filterInputs = document.querySelectorAll('#my-filter-row input, #my-filter-row select');
            let hasConditions = false;

            filterInputs.forEach(input => {
                const fieldCode = input.getAttribute('data-field');
                const value = input.value.trim();

                // $ledger_type以外で値が入力されているかチェック
                if (fieldCode && value && fieldCode !== '$ledger_type') {
                    hasConditions = true;
                }
            });

            return hasConditions;
        }

        // 🚫 無条件検索エラー表示
        static _showNoConditionError() {
            // 既存のエラーメッセージを削除
            const existingError = document.querySelector('.no-condition-error');
            if (existingError) {
                existingError.remove();
            }

            // エラーメッセージを作成
            const errorDiv = document.createElement('div');
            errorDiv.className = 'no-condition-error';
            errorDiv.style.cssText = `
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                color: #856404;
                padding: 12px 16px;
                margin: 10px 0;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                position: relative;
            `;
            errorDiv.innerHTML = `
                <span style="margin-right: 8px;">⚠️</span>
                <span>検索条件を1つ以上入力してください。無条件での検索は実行できません。</span>
            `;

            // テーブルの上に挿入
            const tableContainer = document.querySelector('#table-container') || document.querySelector('#my-table');
            if (tableContainer && tableContainer.parentNode) {
                tableContainer.parentNode.insertBefore(errorDiv, tableContainer);
            } else {
                // フォールバック：bodyに追加
                document.body.appendChild(errorDiv);
            }

            // 5秒後に自動で削除
            setTimeout(() => {
                if (errorDiv && errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 5000);
        }
    }

    // =============================================================================
    // グローバルエクスポート
    // =============================================================================

    // LedgerV2名前空間にエクスポート
    window.LedgerV2.TableHeader.TableCreator = TableCreator;
    window.LedgerV2.TableHeader.HeaderButtonManager = HeaderButtonManager;

    // レガシー互換性のためグローバルに割り当て
    window.TableCreator = TableCreator;
    window.HeaderButtonManager = HeaderButtonManager;

})(); 