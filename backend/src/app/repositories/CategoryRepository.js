import Category from '../models/Category.js'

function applySession(query, session) {
    return session ? query.session(session) : query
}

function applyCaseInsensitiveNameMatch(query) {
    return query.collation({ locale: 'en', strength: 2 })
}

export const CategoryRepository = {
    count(options = {}) {
        return applySession(Category.countDocuments({}), options.session)
    },

    list(options = {}) {
        return applySession(
            Category.find().sort({ group: 1, name: 1 }),
            options.session
        )
    },

    findById(categoryId, options = {}) {
        return applySession(Category.findById(categoryId), options.session)
    },

    findByNameAndGroup({ name, group, excludeId }, options = {}) {
        const query = {
            name,
            group,
            ...(excludeId ? { _id: { $ne: excludeId } } : {})
        }

        return applyCaseInsensitiveNameMatch(
            applySession(Category.findOne(query), options.session)
        )
    },

    async create(payload, options = {}) {
        const category = new Category(payload)
        await category.save(options.session ? { session: options.session } : undefined)
        return category
    },

    save(category, options = {}) {
        return category.save(options.session ? { session: options.session } : undefined)
    },

    updateById(categoryId, updates, options = {}) {
        return applySession(
            Category.findByIdAndUpdate(categoryId, updates, {
                new: true,
                runValidators: true
            }),
            options.session
        )
    },

    deleteById(categoryId, options = {}) {
        return applySession(Category.findByIdAndDelete(categoryId), options.session)
    }
}
