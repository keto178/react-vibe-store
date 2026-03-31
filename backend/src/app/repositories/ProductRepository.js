import Product from '../models/Product.js'

function applySession(query, session) {
    return session ? query.session(session) : query
}

function withCategory(query) {
    return query.populate('category')
}

export const ProductRepository = {
    list(filters = {}, options = {}) {
        const query = {}

        if (filters.categoryId) {
            query.category = filters.categoryId
        }

        return withCategory(
            applySession(
                Product.find(query).sort({ createdAt: -1 }),
                options.session
            )
        )
    },

    findById(productId, options = {}) {
        return applySession(Product.findById(productId), options.session)
    },

    findByIdWithCategory(productId, options = {}) {
        return withCategory(
            applySession(Product.findById(productId), options.session)
        )
    },

    findIdsByCategoryId(categoryId, options = {}) {
        return applySession(
            Product.find({ category: categoryId }).select('_id'),
            options.session
        )
    },

    async create(payload, options = {}) {
        const product = new Product(payload)
        await product.save(options.session ? { session: options.session } : undefined)
        return product
    },

    save(product, options = {}) {
        return product.save(options.session ? { session: options.session } : undefined)
    },

    updateById(productId, updates, options = {}) {
        return applySession(
            Product.findByIdAndUpdate(productId, updates, {
                new: true,
                runValidators: true
            }),
            options.session
        )
    },

    deleteById(productId, options = {}) {
        return applySession(Product.findByIdAndDelete(productId), options.session)
    },

    deleteManyByCategoryId(categoryId, options = {}) {
        return applySession(Product.deleteMany({ category: categoryId }), options.session)
    },

    clearNicotineLevelsByCategoryId(categoryId, options = {}) {
        return applySession(
            Product.updateMany(
                { category: categoryId },
                {
                    $set: {
                        nicotineLevels: []
                    }
                }
            ),
            options.session
        )
    }
}
