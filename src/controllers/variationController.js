const variationService = require('../services/variationService');

// CREATE
exports.createVariation = async (req, res, next) => {
    try {
        const variation = await variationService.createVariation(req.body);
        res.status(201).json({ success: true, data: variation });
    } catch (err) {
        next(err);
    }
};

// READ ALL
exports.getVariations = async (req, res, next) => {
    try {
        const filters = {
            product_id: req.query.product_id,
            color: req.query.color,
            size: req.query.size,
            in_stock: req.query.in_stock
        };
        
        const variations = await variationService.getVariations(filters);
        res.json({ success: true, data: variations });
    } catch (err) {
        next(err);
    }
};

// READ ONE
exports.getVariationById = async (req, res, next) => {
    try {
        const variation = await variationService.getVariationById(req.params.id);
        if (!variation) {
            return res.status(404).json({ success: false, message: 'Variation non trouvée' });
        }
        res.json({ success: true, data: variation });
    } catch (err) {
        next(err);
    }
};

// READ BY PRODUCT
exports.getVariationsByProduct = async (req, res, next) => {
    try {
        const variations = await variationService.getVariationsByProduct(req.params.productId);
        res.json({ success: true, data: variations });
    } catch (err) {
        next(err);
    }
};

// UPDATE
exports.updateVariation = async (req, res, next) => {
    try {
        const variation = await variationService.updateVariation(req.params.id, req.body);
        if (!variation) {
            return res.status(404).json({ success: false, message: 'Variation non trouvée' });
        }
        res.json({ success: true, data: variation });
    } catch (err) {
        next(err);
    }
};

// UPDATE STOCK
exports.updateStock = async (req, res, next) => {
    try {
        const variation = await variationService.updateStock(req.params.id, req.body.stock);
        res.json({ success: true, data: variation });
    } catch (err) {
        next(err);
    }
};

// DELETE
exports.deleteVariation = async (req, res, next) => {
    try {
        await variationService.deleteVariation(req.params.id);
        res.json({ success: true, message: 'Variation supprimée' });
    } catch (err) {
        next(err);
    }
};

// CHECK STOCK
exports.checkStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { quantity } = req.query;
        
        const available = await variationService.checkStock(id, quantity || 1);
        res.json({ 
            success: true, 
            data: { 
                available,
                variation_id: id,
                requested: quantity || 1
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET AVAILABLE COLORS
exports.getAvailableColors = async (req, res, next) => {
    try {
        const colors = await variationService.getAvailableColors(req.params.productId);
        res.json({ success: true, data: colors });
    } catch (err) {
        next(err);
    }
};

// GET AVAILABLE SIZES
exports.getAvailableSizes = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { color } = req.query;
        
        const sizes = await variationService.getAvailableSizes(productId, color);
        res.json({ success: true, data: sizes });
    } catch (err) {
        next(err);
    }
};