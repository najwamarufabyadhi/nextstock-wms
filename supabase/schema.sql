-- ==============================================================================
-- NexStock WMS Database Schema & Atomic Stored Procedures (Supabase / PostgreSQL)
-- Multi-Warehouse, Multi-UoM, HPP Valuation, Scan-to-Pack, FEFO, & Audit Ledger
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABEL UTAMA (CORE ENTITIES)
-- ==============================================================================

-- 2.1 Cabang Gudang Fisik (Warehouses)
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 Master Data SKU Produk & Valuasi HPP (Products)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Umum',
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs', -- Satuan dasar (base unit)
    unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0, -- HPP per unit (Moving Average Cost)
    barcode VARCHAR(100),
    packaging_units JSONB DEFAULT '[]'::jsonb, -- Konversi bertingkat (e.g. 1 dus = 24 pcs)
    min_stock_alert INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 Level Stok per Gudang & Pemetaan Rak Digital Twin (Inventory Levels)
CREATE TABLE IF NOT EXISTS inventory_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    bin_location VARCHAR(30) DEFAULT 'RAK-A1-01',
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_product ON inventory_levels(warehouse_id, product_id);

-- 2.4 Batch & Tanggal Kadaluwarsa (FEFO Tracking)
CREATE TABLE IF NOT EXISTS stock_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    batch_no VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    initial_quantity INTEGER NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC(15,2) DEFAULT 0,
    received_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(warehouse_id, product_id, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_stock_batches_expiry ON stock_batches(warehouse_id, product_id, expiry_date ASC);

-- 2.5 Buku Besar Mutasi Stok Kronologis (Immutable Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    product_id UUID NOT NULL REFERENCES products(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('IN', 'OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT')),
    quantity_change INTEGER NOT NULL, -- Positif untuk masuk (+), negatif untuk keluar (-)
    input_unit VARCHAR(30),
    input_qty INTEGER,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    total_cost NUMERIC(15,2) DEFAULT 0,
    batch_no VARCHAR(50),
    reference_no VARCHAR(100),
    notes TEXT,
    created_by UUID, -- Mengacu ke auth.users(id)
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_wh_date ON stock_movements(warehouse_id, created_at DESC);

-- 2.6 Dokumen Transfer Antar-Gudang (Inter-Warehouse Transfers)
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_no VARCHAR(50) UNIQUE NOT NULL,
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status VARCHAR(30) NOT NULL DEFAULT 'IN_TRANSIT' CHECK (status IN ('IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_by UUID,
    received_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- 2.7 Dokumen Stock Opname Fisik (Physical Audit & Variance Approval)
CREATE TABLE IF NOT EXISTS stock_opnames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opname_no VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    notes TEXT,
    created_by UUID,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opname_id UUID NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    system_qty INTEGER NOT NULL,
    physical_qty INTEGER NOT NULL,
    difference INTEGER NOT NULL -- physical_qty - system_qty
);

-- 2.8 Antrean Pemenuhan Pesanan Keluar (Outbound Fulfillment & Scan-to-Pack)
CREATE TABLE IF NOT EXISTS fulfillment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    customer_name VARCHAR(150) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    courier VARCHAR(50) NOT NULL DEFAULT 'JNE Cargo',
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'HIGH', 'URGENT')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PICKING', 'PACKED', 'SHIPPED')),
    shipping_label_url TEXT,
    tracking_number VARCHAR(100),
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fulfillment_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES fulfillment_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),
    packed_qty INTEGER NOT NULL DEFAULT 0 CHECK (packed_qty >= 0),
    batch_no VARCHAR(50),
    bin_location VARCHAR(30)
);

-- 2.9 Profil User & Hak Akses (RBAC)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- Mengacu ke auth.users(id)
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'WAREHOUSE_STAFF' CHECK (role IN ('SUPER_ADMIN', 'WAREHOUSE_LEAD', 'WAREHOUSE_STAFF')),
    warehouse_id UUID REFERENCES warehouses(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. STORED PROCEDURES (RPC) TRANSAKSI ATOMIK (Pencegahan Race Condition)
-- ==============================================================================

-- 3.1 Catat Mutasi Langsung (Inbound / Outbound) dengan Row-Level Locking
CREATE OR REPLACE FUNCTION fn_record_stock_movement(
    p_warehouse_id UUID,
    p_product_id UUID,
    p_type VARCHAR,
    p_quantity INTEGER,
    p_reference_no VARCHAR,
    p_notes TEXT,
    p_unit_cost NUMERIC DEFAULT 0,
    p_batch_no VARCHAR DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stock INTEGER := 0;
    v_qty_change INTEGER;
    v_inventory_id UUID;
    v_cost NUMERIC := p_unit_cost;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Kuantitas harus lebih besar dari 0';
    END IF;

    IF p_type NOT IN ('IN', 'OUT', 'ADJUSTMENT') THEN
        RAISE EXCEPTION 'Tipe mutasi tidak valid: %', p_type;
    END IF;

    IF p_type = 'OUT' THEN
        v_qty_change := -p_quantity;
    ELSE
        v_qty_change := p_quantity;
    END IF;

    -- Ambil HPP produk jika parameter cost adalah 0
    IF v_cost = 0 THEN
        SELECT unit_cost INTO v_cost FROM products WHERE id = p_product_id;
    END IF;

    -- Kunci baris inventory_levels untuk operasi atomik (FOR UPDATE)
    SELECT id, quantity_on_hand 
    INTO v_inventory_id, v_current_stock
    FROM inventory_levels
    WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id
    FOR UPDATE;

    IF v_inventory_id IS NULL THEN
        IF p_type = 'OUT' THEN
            RAISE EXCEPTION 'Tidak dapat mengeluarkan barang. Stok produk di gudang ini adalah 0.';
        END IF;

        INSERT INTO inventory_levels (warehouse_id, product_id, quantity_on_hand)
        VALUES (p_warehouse_id, p_product_id, p_quantity)
        RETURNING id, quantity_on_hand INTO v_inventory_id, v_current_stock;
    ELSE
        IF p_type = 'OUT' AND (v_current_stock - p_quantity) < 0 THEN
            RAISE EXCEPTION 'Stok tidak mencukupi! Stok saat ini: %, permintaan keluar: %', v_current_stock, p_quantity;
        END IF;

        UPDATE inventory_levels
        SET quantity_on_hand = quantity_on_hand + v_qty_change,
            updated_at = now()
        WHERE id = v_inventory_id;
    END IF;

    -- Catat di Buku Besar (Immutable Ledger)
    INSERT INTO stock_movements (
        warehouse_id,
        product_id,
        type,
        quantity_change,
        unit_cost,
        total_cost,
        batch_no,
        reference_no,
        notes,
        created_by
    )
    VALUES (
        p_warehouse_id,
        p_product_id,
        p_type,
        v_qty_change,
        v_cost,
        v_cost * ABS(v_qty_change),
        p_batch_no,
        p_reference_no,
        p_notes,
        p_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'warehouse_id', p_warehouse_id,
        'product_id', p_product_id,
        'previous_stock', v_current_stock,
        'new_stock', v_current_stock + v_qty_change,
        'type', p_type
    );
END;
$$;

-- 3.2 Buat Transfer Antar-Gudang (Status: IN_TRANSIT, Potong Gudang Pengirim)
CREATE OR REPLACE FUNCTION fn_create_stock_transfer(
    p_transfer_no VARCHAR,
    p_from_warehouse_id UUID,
    p_to_warehouse_id UUID,
    p_items JSONB, -- Format: [{"product_id": "...", "quantity": 10}]
    p_notes TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_transfer_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_current_stock INTEGER;
    v_cost NUMERIC;
BEGIN
    IF p_from_warehouse_id = p_to_warehouse_id THEN
        RAISE EXCEPTION 'Gudang asal dan tujuan tidak boleh sama.';
    END IF;

    INSERT INTO stock_transfers (
        transfer_no,
        from_warehouse_id,
        to_warehouse_id,
        status,
        notes,
        created_by
    )
    VALUES (
        p_transfer_no,
        p_from_warehouse_id,
        p_to_warehouse_id,
        'IN_TRANSIT',
        p_notes,
        p_user_id
    )
    RETURNING id INTO v_transfer_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'Jumlah transfer item harus lebih besar dari 0';
        END IF;

        SELECT quantity_on_hand INTO v_current_stock
        FROM inventory_levels
        WHERE warehouse_id = p_from_warehouse_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_current_stock IS NULL OR v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Stok tidak mencukupi di gudang pengirim untuk produk ID: %', v_product_id;
        END IF;

        SELECT unit_cost INTO v_cost FROM products WHERE id = v_product_id;

        UPDATE inventory_levels
        SET quantity_on_hand = quantity_on_hand - v_quantity,
            updated_at = now()
        WHERE warehouse_id = p_from_warehouse_id AND product_id = v_product_id;

        INSERT INTO stock_movements (
            warehouse_id,
            product_id,
            type,
            quantity_change,
            unit_cost,
            total_cost,
            reference_no,
            notes,
            created_by
        )
        VALUES (
            p_from_warehouse_id,
            v_product_id,
            'TRANSFER_OUT',
            -v_quantity,
            v_cost,
            v_cost * v_quantity,
            p_transfer_no,
            'Transfer keluar menuju cabang tujuan',
            p_user_id
        );

        INSERT INTO stock_transfer_items (transfer_id, product_id, quantity)
        VALUES (v_transfer_id, v_product_id, v_quantity);
    END LOOP;

    RETURN v_transfer_id;
END;
$$;

-- 3.3 Konfirmasi Terima Transfer (Gudang Penerima -> COMPLETED)
CREATE OR REPLACE FUNCTION fn_complete_stock_transfer(
    p_transfer_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_transfer RECORD;
    v_item RECORD;
    v_cost NUMERIC;
BEGIN
    SELECT * INTO v_transfer
    FROM stock_transfers
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan.';
    END IF;

    IF v_transfer.status != 'IN_TRANSIT' THEN
        RAISE EXCEPTION 'Dokumen transfer tidak dalam status IN_TRANSIT (Status saat ini: %)', v_transfer.status;
    END IF;

    FOR v_item IN SELECT * FROM stock_transfer_items WHERE transfer_id = p_transfer_id
    LOOP
        SELECT unit_cost INTO v_cost FROM products WHERE id = v_item.product_id;

        INSERT INTO inventory_levels (warehouse_id, product_id, quantity_on_hand)
        VALUES (v_transfer.to_warehouse_id, v_item.product_id, v_item.quantity)
        ON CONFLICT (warehouse_id, product_id)
        DO UPDATE SET
            quantity_on_hand = inventory_levels.quantity_on_hand + EXCLUDED.quantity_on_hand,
            updated_at = now();

        INSERT INTO stock_movements (
            warehouse_id,
            product_id,
            type,
            quantity_change,
            unit_cost,
            total_cost,
            reference_no,
            notes,
            created_by
        )
        VALUES (
            v_transfer.to_warehouse_id,
            v_item.product_id,
            'TRANSFER_IN',
            v_item.quantity,
            v_cost,
            v_cost * v_item.quantity,
            v_transfer.transfer_no,
            'Penerimaan barang dari cabang pengirim',
            p_user_id
        );
    END LOOP;

    UPDATE stock_transfers
    SET status = 'COMPLETED',
        received_by = p_user_id,
        completed_at = now()
    WHERE id = p_transfer_id;

    RETURN true;
END;
$$;

-- 3.4 Persetujuan Stock Opname oleh Lead/Admin (Approval -> Generate ADJUSTMENT)
CREATE OR REPLACE FUNCTION fn_approve_stock_opname(
    p_opname_id UUID,
    p_approver_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_opname RECORD;
    v_item RECORD;
    v_cost NUMERIC;
BEGIN
    SELECT * INTO v_opname
    FROM stock_opnames
    WHERE id = p_opname_id
    FOR UPDATE;

    IF v_opname IS NULL THEN
        RAISE EXCEPTION 'Dokumen Stock Opname tidak ditemukan.';
    END IF;

    IF v_opname.status != 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'Stock Opname belum siap disetujui (Status: %)', v_opname.status;
    END IF;

    FOR v_item IN SELECT * FROM stock_opname_items WHERE opname_id = p_opname_id
    LOOP
        IF v_item.difference != 0 THEN
            SELECT unit_cost INTO v_cost FROM products WHERE id = v_item.product_id;

            UPDATE inventory_levels
            SET quantity_on_hand = v_item.physical_qty,
                updated_at = now()
            WHERE warehouse_id = v_opname.warehouse_id AND product_id = v_item.product_id;

            INSERT INTO stock_movements (
                warehouse_id,
                product_id,
                type,
                quantity_change,
                unit_cost,
                total_cost,
                reference_no,
                notes,
                created_by
            )
            VALUES (
                v_opname.warehouse_id,
                v_item.product_id,
                'ADJUSTMENT',
                v_item.difference,
                v_cost,
                v_cost * ABS(v_item.difference),
                v_opname.opname_no,
                'Penyesuaian hasil Stock Opname. Fisik: ' || v_item.physical_qty || ', Sistem: ' || v_item.system_qty,
                p_approver_id
            );
        END IF;
    END LOOP;

    UPDATE stock_opnames
    SET status = 'APPROVED',
        approved_by = p_approver_id,
        approved_at = now()
    WHERE id = p_opname_id;

    RETURN true;
END;
$$;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Izinkan pembacaan data publik / anon untuk kemudahan inisialisasi awal
CREATE POLICY "Allow public read on warehouses" ON warehouses FOR SELECT USING (true);
CREATE POLICY "Allow public read on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read on inventory_levels" ON inventory_levels FOR SELECT USING (true);
CREATE POLICY "Allow public read on stock_batches" ON stock_batches FOR SELECT USING (true);
CREATE POLICY "Allow public read on stock_movements" ON stock_movements FOR SELECT USING (true);
CREATE POLICY "Allow public read on stock_transfers" ON stock_transfers FOR SELECT USING (true);
CREATE POLICY "Allow public read on stock_opnames" ON stock_opnames FOR SELECT USING (true);
CREATE POLICY "Allow public read on fulfillment_orders" ON fulfillment_orders FOR SELECT USING (true);
CREATE POLICY "Allow public read on profiles" ON profiles FOR SELECT USING (true);

-- Izinkan write/update untuk operasi sistem
CREATE POLICY "Allow system insert on stock_movements" ON stock_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow system update on inventory_levels" ON inventory_levels FOR ALL USING (true);
CREATE POLICY "Allow system write on transfers" ON stock_transfers FOR ALL USING (true);
CREATE POLICY "Allow system write on opnames" ON stock_opnames FOR ALL USING (true);

-- ==============================================================================
-- 5. SEED DATA LENGKAP (MASTER DATA & TRANSAKSI AWAL)
-- ==============================================================================

-- 5.1 Cabang Gudang
INSERT INTO warehouses (id, code, name, address, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'WH-JKT-01', 'Gudang Pusat Jakarta', 'Kawasan Industri Pulogadung, Jakarta Timur', true),
('a0000000-0000-0000-0000-000000000002', 'WH-SBY-02', 'Gudang Distribusi Surabaya', 'Kawasan SIER Rungkut Industri, Surabaya', true),
('a0000000-0000-0000-0000-000000000003', 'WH-MDN-03', 'Hub Logistik Medan', 'Kawasan Industri Medan (KIM), Medan', true)
ON CONFLICT (id) DO NOTHING;

-- 5.2 Master Produk dengan HPP & Konversi Kemasan (Multi-UoM)
INSERT INTO products (id, sku, name, category, unit, unit_cost, barcode, packaging_units, min_stock_alert) VALUES
('b0000000-0000-0000-0000-000000000001', 'SKU-LOG-001', 'Kardus Double Wall A4 Premium', 'Packaging', 'box', 6500, '899123456001', '[{"unitName":"ikat","multiplier":10,"barcode":"899123456011"},{"unitName":"bal","multiplier":50,"barcode":"899123456012"}]'::jsonb, 50),
('b0000000-0000-0000-0000-000000000002', 'SKU-LOG-002', 'Bubble Wrap Heavy Duty 50m', 'Packaging', 'roll', 125000, '899123456002', '[{"unitName":"karung","multiplier":4,"barcode":"899123456021"},{"unitName":"pallet","multiplier":24,"barcode":"899123456022"}]'::jsonb, 20),
('b0000000-0000-0000-0000-000000000003', 'SKU-ELC-001', 'Barcode Scanner Wireless 2D', 'Equipment', 'unit', 450000, '899123456003', '[{"unitName":"karton","multiplier":10,"barcode":"899123456031"}]'::jsonb, 5),
('b0000000-0000-0000-0000-000000000004', 'SKU-ELC-002', 'Thermal Shipping Label Printer 4-Inch', 'Equipment', 'unit', 1850000, '899123456004', '[{"unitName":"karton","multiplier":4,"barcode":"899123456041"}]'::jsonb, 4),
('b0000000-0000-0000-0000-000000000005', 'SKU-MAT-001', 'Stretch Film Industri 500mm x 2.5kg', 'Packaging', 'roll', 78000, '899123456005', '[{"unitName":"box","multiplier":6,"barcode":"899123456051"}]'::jsonb, 15),
('b0000000-0000-0000-0000-000000000006', 'SKU-SAF-001', 'Rompi Safety Reflektor Fluo Pro', 'Safety Gear', 'pcs', 35000, '899123456006', '[{"unitName":"lusin","multiplier":12,"barcode":"899123456061"}]'::jsonb, 25),
('b0000000-0000-0000-0000-000000000007', 'SKU-SAF-002', 'Sarung Tangan Karet Grip Pro Heavy', 'Safety Gear', 'pair', 18000, '899123456007', '[{"unitName":"pak","multiplier":10,"barcode":"899123456071"}]'::jsonb, 30),
('b0000000-0000-0000-0000-000000000008', 'SKU-OFF-001', 'Thermal Label Barcode Roll 100x150', 'Consumables', 'roll', 42000, '899123456008', '[{"unitName":"dus","multiplier":20,"barcode":"899123456081"}]'::jsonb, 40)
ON CONFLICT (id) DO NOTHING;

-- 5.3 Stok Awal & Pemetaan Rak di Gudang Pusat Jakarta
INSERT INTO inventory_levels (warehouse_id, product_id, bin_location, quantity_on_hand) VALUES
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'RAK-A1-01', 340),
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'RAK-A1-02', 9),   -- Menipis
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'RAK-B2-01', 14),
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'RAK-B2-02', 2),   -- Menipis
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'RAK-C1-01', 48),
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'RAK-D3-01', 75),
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'RAK-D3-02', 115),
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008', 'RAK-C1-02', 74)
ON CONFLICT (warehouse_id, product_id) DO NOTHING;

-- 5.4 Batch Stok untuk Fitur FEFO Radar
INSERT INTO stock_batches (product_id, warehouse_id, batch_no, expiry_date, quantity_on_hand, initial_quantity, cost_per_unit) VALUES
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'LOT-2025-F19', CURRENT_DATE + INTERVAL '18 days', 22, 50, 78000),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'LOT-2025-B99', CURRENT_DATE + INTERVAL '37 days', 9, 30, 125000),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'LOT-2026-F01', CURRENT_DATE + INTERVAL '180 days', 26, 30, 78000)
ON CONFLICT (warehouse_id, product_id, batch_no) DO NOTHING;

-- 5.5 Riwayat Awal Buku Besar (Audit Ledger)
INSERT INTO stock_movements (warehouse_id, product_id, type, quantity_change, unit_cost, total_cost, reference_no, notes) VALUES
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'IN', 350, 6500, 2275000, 'PO-2026-1049', 'Penerimaan Inbound PO Supplier PT Sumber Pack'),
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'OUT', -15, 125000, 1875000, 'DO-2026-0011', 'Fulfillment pesanan ekspedisi'),
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'IN', 2, 1850000, 3700000, 'PO-2026-0033', 'Restock printer thermal koli');
