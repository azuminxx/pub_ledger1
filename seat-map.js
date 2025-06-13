/**
 * 🪑 座席表管理システム - JavaScript
 * @description 座席表のドラッグ&ドロップ機能とkintone連携
 * @version 1.0.0
 */

(() => {
    'use strict';

    // =============================================================================
    // 🌐 グローバル変数
    // =============================================================================
    
    let seatMapData = [];           // 座席データ
    let filteredSeats = [];         // フィルター済み座席データ
    let selectedSeat = null;        // 選択中の座席
    let isDragging = false;         // ドラッグ中フラグ
    let dragOffset = { x: 0, y: 0 }; // ドラッグオフセット
    let currentZoom = 1;            // 現在のズーム倍率
    let hasUnsavedChanges = false;  // 未保存の変更フラグ
    
    // キャンバス移動関連
    let isPanning = false;          // キャンバス移動中フラグ
    let panStartX = 0;              // パン開始X座標
    let panStartY = 0;              // パン開始Y座標
    let canvasOffsetX = 0;          // キャンバスX方向オフセット
    let canvasOffsetY = 0;          // キャンバスY方向オフセット

    // DOM要素の参照
    const elements = {
        canvas: null,
        locationFilter: null,
        floorFilter: null,
        zoomControl: null,
        zoomValue: null,
        seatCount: null,
        selectedSeatSpan: null,
        lastSaved: null,
        loadingOverlay: null,
        modal: null,
        modalContent: null
    };

    // =============================================================================
    // 🚀 初期化
    // =============================================================================

    /**
     * システム初期化
     */
    function initSeatMap() {
        console.log('🪑 座席表システム初期化開始');
        
        // 座席表ページかどうかをチェック
        if (!document.getElementById('seat-map-canvas')) {
            console.log('ℹ️ 座席表ページではないため、初期化をスキップします');
            return;
        }
        
        // DOM要素の取得
        initDOMElements();
        
        // イベントリスナーの設定
        setupEventListeners();
        
        // 座席データの読み込み
        loadSeatData();
        
        console.log('✅ 座席表システム初期化完了');
    }

    /**
     * DOM要素の初期化
     */
    function initDOMElements() {
        elements.canvas = document.getElementById('seat-map-canvas');
        elements.locationFilter = document.getElementById('location-filter');
        elements.floorFilter = document.getElementById('floor-filter');
        elements.zoomControl = document.getElementById('zoom-control');
        elements.zoomValue = document.getElementById('zoom-value');
        elements.seatCount = document.getElementById('seat-count');
        elements.selectedSeatSpan = document.getElementById('selected-seat');
        elements.lastSaved = document.getElementById('last-saved');
        elements.loadingOverlay = document.getElementById('loading-overlay');
        elements.modal = document.getElementById('seat-detail-modal');
        elements.modalContent = document.getElementById('seat-detail-content');
        
        // 必須要素の存在チェック
        if (!elements.canvas) {
            throw new Error('座席表キャンバス要素が見つかりません');
        }
    }

    /**
     * イベントリスナーの設定
     */
    function setupEventListeners() {
        // ヘッダーボタン
        const saveBtn = document.getElementById('save-positions-btn');
        const resetBtn = document.getElementById('reset-positions-btn');
        const closeBtn = document.getElementById('close-seat-map-btn');
        
        if (saveBtn) saveBtn.addEventListener('click', savePositions);
        if (resetBtn) resetBtn.addEventListener('click', resetPositions);
        if (closeBtn) closeBtn.addEventListener('click', closeSeatMap);
        
        // コントロールパネル
        if (elements.locationFilter) elements.locationFilter.addEventListener('change', applyFilters);
        if (elements.floorFilter) elements.floorFilter.addEventListener('change', applyFilters);
        if (elements.zoomControl) elements.zoomControl.addEventListener('input', handleZoomChange);
        
        const autoArrangeBtn = document.getElementById('auto-arrange-btn');
        if (autoArrangeBtn) autoArrangeBtn.addEventListener('click', autoArrangeSeats);
        
        // キャンバスイベント
        elements.canvas.addEventListener('dragover', handleDragOver);
        elements.canvas.addEventListener('drop', handleDrop);
        
        // キャンバス移動イベント
        elements.canvas.addEventListener('mousedown', handleCanvasPanStart);
        document.addEventListener('mousemove', handleCanvasPanMove);
        document.addEventListener('mouseup', handleCanvasPanEnd);
        
        // スクロール移動イベント
        elements.canvas.addEventListener('wheel', handleCanvasScroll, { passive: false });
        
        // モーダル関連
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        elements.modal.addEventListener('click', (e) => {
            if (e.target === elements.modal) closeModal();
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', handleKeyDown);
        
        // ページ離脱時の警告
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '未保存の変更があります。本当にページを離れますか？';
            }
        });
    }

    // =============================================================================
    // 📊 データ管理
    // =============================================================================

    /**
     * 座席データの読み込み
     */
    async function loadSeatData() {
        showLoading(true);
        
        try {
            console.log('📊 座席データ読み込み開始');
            
            // kintoneから座席データを取得
            const seatRecords = await fetchSeatRecords();
            
            // 関連データ（PC、内線、ユーザー）を取得
            const relatedData = await fetchRelatedData();
            
            // データを統合
            seatMapData = integrateSeatData(seatRecords, relatedData);
            
            // フィルターオプションを更新
            updateFilterOptions();
            
            // 座席表を描画
            renderSeatMap();
            
            console.log(`✅ 座席データ読み込み完了: ${seatMapData.length}件`);
            
        } catch (error) {
            console.error('❌ 座席データ読み込みエラー:', error);
            showError('座席データの読み込みに失敗しました。');
        } finally {
            showLoading(false);
        }
    }

    /**
     * kintoneから座席レコードを取得
     */
    async function fetchSeatRecords() {
        const appId = window.LedgerV2?.Config?.APP_IDS?.SEAT || 8;
        
        const query = `座席表表示 in ("表示", "") order by 座席番号 asc`;
        
        return new Promise((resolve, reject) => {
            kintone.api('/k/v1/records', 'GET', {
                app: appId,
                query: query,
                totalCount: true
            }).then(resp => {
                resolve(resp.records);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
     * 関連データ（PC、内線、ユーザー）を取得
     */
    async function fetchRelatedData() {
        const appIds = window.LedgerV2?.Config?.APP_IDS || {};
        
        const promises = [
            fetchRecords(appIds.PC || 6, 'PC番号'),
            fetchRecords(appIds.EXT || 7, '内線番号'),
            fetchRecords(appIds.USER || 13, 'ユーザーID')
        ];
        
        const [pcRecords, extRecords, userRecords] = await Promise.all(promises);
        
        return {
            pc: createLookupMap(pcRecords, 'PC番号'),
            ext: createLookupMap(extRecords, '内線番号'),
            user: createLookupMap(userRecords, 'ユーザーID')
        };
    }

    /**
     * レコードを取得する汎用関数
     */
    function fetchRecords(appId, orderField) {
        return new Promise((resolve, reject) => {
            kintone.api('/k/v1/records', 'GET', {
                app: appId,
                query: `order by ${orderField} asc`,
                totalCount: true
            }).then(resp => {
                resolve(resp.records);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
     * ルックアップマップを作成
     */
    function createLookupMap(records, keyField) {
        const map = new Map();
        records.forEach(record => {
            const key = record[keyField]?.value;
            if (key) {
                map.set(key, record);
            }
        });
        return map;
    }

    /**
     * 座席データを統合
     */
    function integrateSeatData(seatRecords, relatedData) {
        return seatRecords.map(seatRecord => {
            const seatNumber = seatRecord['座席番号']?.value || '';
            const pcNumber = seatRecord['PC番号']?.value || '';
            const extNumber = seatRecord['内線番号']?.value || '';
            const userId = seatRecord['ユーザーID']?.value || '';
            
            // 関連データを取得
            const pcData = relatedData.pc.get(pcNumber);
            const extData = relatedData.ext.get(extNumber);
            const userData = relatedData.user.get(userId);
            
            return {
                recordId: seatRecord['$id']?.value,
                seatNumber: seatNumber,
                location: seatRecord['座席拠点']?.value || '',
                floor: seatRecord['階数']?.value || '',
                department: seatRecord['座席部署']?.value || '',
                x: parseFloat(seatRecord['X座標']?.value) || 0,
                y: parseFloat(seatRecord['Y座標']?.value) || 0,
                display: seatRecord['座席表表示']?.value || '表示',
                
                // 関連データ
                pcNumber: pcNumber,
                pcPurpose: pcData?.['PC用途']?.value || '',
                extNumber: extNumber,
                extType: extData?.['電話機種別']?.value || '',
                userId: userId,
                userName: userData?.['ユーザー名']?.value || '',
                
                // 表示用データ
                isEmpty: !userId || !userData,
                displayName: userData?.['ユーザー名']?.value || '空席'
            };
        });
    }

    // =============================================================================
    // 🎨 描画機能
    // =============================================================================

    /**
     * 座席表を描画
     */
    function renderSeatMap() {
        // フィルターを適用
        applyFilters();
    }

    /**
     * フィルターを適用して座席を表示
     */
    function applyFilters() {
        const locationValue = elements.locationFilter.value;
        const floorValue = elements.floorFilter.value;
        
        // フィルター適用
        filteredSeats = seatMapData.filter(seat => {
            if (locationValue && seat.location !== locationValue) return false;
            if (floorValue && seat.floor !== floorValue) return false;
            return seat.display === '表示';
        });
        
        // 座席カードを描画
        renderSeatCards();
        
        // ステータス更新
        updateStatus();
    }

    /**
     * 座席カードを描画
     */
    function renderSeatCards() {
        // 既存のカードをクリア
        elements.canvas.innerHTML = '';
        
        filteredSeats.forEach(seat => {
            const card = createSeatCard(seat);
            elements.canvas.appendChild(card);
        });
    }

    /**
     * 座席カードを作成
     */
    function createSeatCard(seat) {
        const card = document.createElement('div');
        card.className = `seat-card ${seat.isEmpty ? 'empty' : ''}`;
        card.style.left = `${seat.x}px`;
        card.style.top = `${seat.y}px`;
        card.draggable = true;
        card.dataset.recordId = seat.recordId;
        card.dataset.seatNumber = seat.seatNumber;
        
        card.innerHTML = `
            <div class="seat-number">${seat.seatNumber}</div>
            <div class="seat-pc">💻 ${seat.pcNumber || '未割当'}</div>
            <div class="seat-ext">☎️ ${seat.extNumber || '未割当'}</div>
            <div class="seat-user">${seat.displayName}</div>
        `;
        
        // イベントリスナーを追加
        setupSeatCardEvents(card, seat);
        
        return card;
    }

    /**
     * 座席カードのイベントを設定
     */
    function setupSeatCardEvents(card, seat) {
        // ドラッグ開始
        card.addEventListener('dragstart', (e) => {
            isDragging = true;
            selectedSeat = seat;
            card.classList.add('dragging');
            
            const rect = card.getBoundingClientRect();
            const canvasRect = elements.canvas.getBoundingClientRect();
            
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', seat.recordId);
        });
        
        // ドラッグ終了
        card.addEventListener('dragend', (e) => {
            isDragging = false;
            card.classList.remove('dragging');
        });
        
        // クリック（詳細表示）
        card.addEventListener('click', (e) => {
            if (!isDragging) {
                selectSeat(seat);
                showSeatDetail(seat);
            }
        });
        
        // ダブルクリック（編集）
        card.addEventListener('dblclick', (e) => {
            editSeat(seat);
        });
    }

    // =============================================================================
    // 🖱️ ドラッグ&ドロップ機能
    // =============================================================================

    /**
     * ドラッグオーバー処理
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        elements.canvas.classList.add('drag-over');
    }

    /**
     * ドロップ処理
     */
    function handleDrop(e) {
        e.preventDefault();
        elements.canvas.classList.remove('drag-over');
        
        if (!selectedSeat) return;
        
        const canvasRect = elements.canvas.getBoundingClientRect();
        const newX = (e.clientX - canvasRect.left - dragOffset.x) / currentZoom;
        const newY = (e.clientY - canvasRect.top - dragOffset.y) / currentZoom;
        
        // 座標を更新
        updateSeatPosition(selectedSeat, newX, newY);
    }

    /**
     * 座席位置を更新
     */
    function updateSeatPosition(seat, newX, newY) {
        // グリッドにスナップ（20pxグリッド）
        const gridSize = 20;
        const snappedX = Math.round(newX / gridSize) * gridSize;
        const snappedY = Math.round(newY / gridSize) * gridSize;
        
        // 境界チェック
        const maxX = elements.canvas.offsetWidth - 120; // カード幅
        const maxY = elements.canvas.offsetHeight - 100; // カード高さ
        
        seat.x = Math.max(0, Math.min(snappedX, maxX));
        seat.y = Math.max(0, Math.min(snappedY, maxY));
        
        // カードの位置を更新
        const card = elements.canvas.querySelector(`[data-record-id="${seat.recordId}"]`);
        if (card) {
            card.style.left = `${seat.x}px`;
            card.style.top = `${seat.y}px`;
        }
        
        // 未保存フラグを設定
        hasUnsavedChanges = true;
        updateStatus();
        
        console.log(`📍 座席位置更新: ${seat.seatNumber} -> (${seat.x}, ${seat.y})`);
    }

    // =============================================================================
    // 🖱️ キャンバス移動機能
    // =============================================================================

    /**
     * キャンバス移動開始
     */
    function handleCanvasPanStart(e) {
        // 座席カードをクリックした場合は移動しない
        if (e.target.closest('.seat-card')) {
            return;
        }
        
        // 右クリックまたはCtrl+クリックでパン開始
        if (e.button === 2 || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            isPanning = true;
            panStartX = e.clientX - canvasOffsetX;
            panStartY = e.clientY - canvasOffsetY;
            elements.canvas.style.cursor = 'grabbing';
            
            // 右クリックメニューを無効化
            elements.canvas.addEventListener('contextmenu', preventContextMenu);
        }
    }

    /**
     * キャンバス移動中
     */
    function handleCanvasPanMove(e) {
        if (!isPanning) return;
        
        e.preventDefault();
        canvasOffsetX = e.clientX - panStartX;
        canvasOffsetY = e.clientY - panStartY;
        
        updateCanvasTransform();
    }

    /**
     * キャンバス移動終了
     */
    function handleCanvasPanEnd(e) {
        if (!isPanning) return;
        
        isPanning = false;
        elements.canvas.style.cursor = 'default';
        
        // 右クリックメニュー無効化を解除
        elements.canvas.removeEventListener('contextmenu', preventContextMenu);
    }

    /**
     * 右クリックメニューを無効化
     */
    function preventContextMenu(e) {
        e.preventDefault();
    }

    /**
     * キャンバスの変形を更新
     */
    function updateCanvasTransform() {
        elements.canvas.style.transform = `translate(${canvasOffsetX}px, ${canvasOffsetY}px) scale(${currentZoom})`;
    }

    /**
     * スクロールによるキャンバス移動
     */
    function handleCanvasScroll(e) {
        e.preventDefault();
        
        const scrollSensitivity = 1.5; // スクロール感度
        
        // Shiftキーが押されている場合は横スクロール
        if (e.shiftKey) {
            canvasOffsetX -= e.deltaY * scrollSensitivity;
        } else {
            // 通常は縦スクロール
            canvasOffsetY -= e.deltaY * scrollSensitivity;
        }
        
        updateCanvasTransform();
    }

    // =============================================================================
    // 💾 保存機能
    // =============================================================================

    /**
     * 位置情報を保存
     */
    async function savePositions() {
        if (!hasUnsavedChanges) {
            showMessage('保存する変更がありません。');
            return;
        }
        
        showLoading(true);
        
        try {
            console.log('💾 座席位置保存開始');
            
            const updatePromises = seatMapData.map(seat => {
                return updateSeatRecord(seat);
            });
            
            await Promise.all(updatePromises);
            
            hasUnsavedChanges = false;
            elements.lastSaved.textContent = `最終保存: ${new Date().toLocaleTimeString()}`;
            
            showMessage('座席位置を保存しました。', 'success');
            console.log('✅ 座席位置保存完了');
            
        } catch (error) {
            console.error('❌ 座席位置保存エラー:', error);
            showError('座席位置の保存に失敗しました。');
        } finally {
            showLoading(false);
        }
    }

    /**
     * 座席レコードを更新
     */
    function updateSeatRecord(seat) {
        const appId = window.LedgerV2?.Config?.APP_IDS?.SEAT || 8;
        
        return new Promise((resolve, reject) => {
            kintone.api('/k/v1/record', 'PUT', {
                app: appId,
                id: seat.recordId,
                record: {
                    'X座標': { value: seat.x.toString() },
                    'Y座標': { value: seat.y.toString() }
                }
            }).then(resp => {
                resolve(resp);
            }).catch(error => {
                reject(error);
            });
        });
    }

    // =============================================================================
    // 🔧 ユーティリティ機能
    // =============================================================================

    /**
     * フィルターオプションを更新
     */
    function updateFilterOptions() {
        // 階数オプションを更新
        const floors = [...new Set(seatMapData.map(seat => seat.floor).filter(f => f))];
        floors.sort();
        
        elements.floorFilter.innerHTML = '<option value="">全階</option>';
        floors.forEach(floor => {
            const option = document.createElement('option');
            option.value = floor;
            option.textContent = `${floor}階`;
            elements.floorFilter.appendChild(option);
        });
    }

    /**
     * ズーム変更処理
     */
    function handleZoomChange(e) {
        currentZoom = parseFloat(e.target.value);
        updateCanvasTransform();
        elements.zoomValue.textContent = `${Math.round(currentZoom * 100)}%`;
    }

    /**
     * 自動配置
     */
    function autoArrangeSeats() {
        if (!confirm('座席を自動配置しますか？現在の位置は失われます。')) return;
        
        const cols = 8; // 1行あたりの座席数
        const cardWidth = 140; // カード幅 + マージン
        const cardHeight = 120; // カード高さ + マージン
        const startX = 20;
        const startY = 20;
        
        filteredSeats.forEach((seat, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            seat.x = startX + (col * cardWidth);
            seat.y = startY + (row * cardHeight);
        });
        
        renderSeatCards();
        hasUnsavedChanges = true;
        updateStatus();
    }

    /**
     * 位置をリセット
     */
    function resetPositions() {
        if (!confirm('座席位置とキャンバス表示をリセットしますか？')) return;
        
        // 座席位置をリセット
        filteredSeats.forEach(seat => {
            seat.x = 0;
            seat.y = 0;
        });
        
        // キャンバス位置をリセット
        canvasOffsetX = 0;
        canvasOffsetY = 0;
        currentZoom = 1;
        elements.zoomControl.value = 1;
        elements.zoomValue.textContent = '100%';
        updateCanvasTransform();
        
        renderSeatCards();
        hasUnsavedChanges = true;
        updateStatus();
    }

    /**
     * 座席を選択
     */
    function selectSeat(seat) {
        // 既存の選択を解除
        document.querySelectorAll('.seat-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 新しい座席を選択
        const card = elements.canvas.querySelector(`[data-record-id="${seat.recordId}"]`);
        if (card) {
            card.classList.add('selected');
        }
        
        selectedSeat = seat;
        elements.selectedSeatSpan.textContent = `選択中: ${seat.seatNumber}`;
    }

    /**
     * 座席詳細を表示
     */
    function showSeatDetail(seat) {
        elements.modalContent.innerHTML = `
            <div class="seat-detail-grid">
                <div class="seat-detail-label">座席番号:</div>
                <div class="seat-detail-value">${seat.seatNumber}</div>
                
                <div class="seat-detail-label">拠点:</div>
                <div class="seat-detail-value">${seat.location}</div>
                
                <div class="seat-detail-label">階数:</div>
                <div class="seat-detail-value">${seat.floor}階</div>
                
                <div class="seat-detail-label">部署:</div>
                <div class="seat-detail-value">${seat.department || '未設定'}</div>
                
                <div class="seat-detail-label">PC番号:</div>
                <div class="seat-detail-value ${!seat.pcNumber ? 'seat-detail-empty' : ''}">${seat.pcNumber || '未割当'}</div>
                
                <div class="seat-detail-label">PC用途:</div>
                <div class="seat-detail-value">${seat.pcPurpose || '未設定'}</div>
                
                <div class="seat-detail-label">内線番号:</div>
                <div class="seat-detail-value ${!seat.extNumber ? 'seat-detail-empty' : ''}">${seat.extNumber || '未割当'}</div>
                
                <div class="seat-detail-label">電話機種別:</div>
                <div class="seat-detail-value">${seat.extType || '未設定'}</div>
                
                <div class="seat-detail-label">使用者:</div>
                <div class="seat-detail-value ${seat.isEmpty ? 'seat-detail-empty' : ''}">${seat.displayName}</div>
                
                <div class="seat-detail-label">座標:</div>
                <div class="seat-detail-value">(${seat.x}, ${seat.y})</div>
            </div>
        `;
        
        elements.modal.style.display = 'block';
    }

    /**
     * モーダルを閉じる
     */
    function closeModal() {
        elements.modal.style.display = 'none';
    }

    /**
     * 座席を編集
     */
    function editSeat(seat) {
        // 統合台帳システムの編集機能を呼び出し
        const seatUrl = `/k/${window.LedgerV2?.Config?.APP_IDS?.SEAT || 8}/show#record=${seat.recordId}`;
        window.open(seatUrl, '_blank');
    }

    /**
     * ステータスを更新
     */
    function updateStatus() {
        elements.seatCount.textContent = `座席数: ${filteredSeats.length}`;
        
        if (hasUnsavedChanges) {
            elements.lastSaved.textContent = '最終保存: 未保存の変更あり';
            elements.lastSaved.style.color = '#ff9800';
        } else {
            elements.lastSaved.style.color = '#666';
        }
    }

    /**
     * キーボードショートカット処理
     */
    function handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    savePositions();
                    break;
                case 'z':
                    e.preventDefault();
                    // TODO: Undo機能
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            closeModal();
            // 選択解除
            document.querySelectorAll('.seat-card.selected').forEach(card => {
                card.classList.remove('selected');
            });
            selectedSeat = null;
            elements.selectedSeatSpan.textContent = '選択中: なし';
        }
    }

    /**
     * 座席表を閉じる
     */
    function closeSeatMap() {
        if (hasUnsavedChanges) {
            if (!confirm('未保存の変更があります。本当に閉じますか？')) {
                return;
            }
        }
        
        // 統合台帳システムに戻る
        window.location.href = 'index.html';
    }

    /**
     * ローディング表示制御
     */
    function showLoading(show) {
        elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    /**
     * メッセージ表示
     */
    function showMessage(message, type = 'info') {
        // 簡易的なメッセージ表示（後で改善可能）
        alert(message);
    }

    /**
     * エラー表示
     */
    function showError(message) {
        console.error('❌', message);
        alert(`エラー: ${message}`);
    }

    // =============================================================================
    // 🌐 グローバル公開
    // =============================================================================

    // 座席表システムをグローバルに公開
    window.SeatMapSystem = {
        init: initSeatMap,
        loadData: loadSeatData,
        savePositions: savePositions,
        autoArrange: autoArrangeSeats
    };

    // DOM読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSeatMap);
    } else {
        initSeatMap();
    }

    console.log('✅ 座席表システム JavaScript 読み込み完了');

})(); 