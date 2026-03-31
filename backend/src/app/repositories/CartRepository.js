import Cart from '../models/Cart.js'

function applySession(query, session) {
    return session ? query.session(session) : query
}

function getSaveOptions(session) {
    return session ? { session } : undefined
}

async function populateCartDocument(cart, session) {
    if (!cart) {
        return null
    }

    await cart.populate({
        path: 'items.product',
        populate: {
            path: 'category'
        },
        options: session ? { session } : undefined
    })

    const validItems = cart.items.filter((item) => item.product && item.product.category)

    if (validItems.length !== cart.items.length) {
        cart.items = validItems
        await cart.save(getSaveOptions(session))
        await cart.populate({
            path: 'items.product',
            populate: {
                path: 'category'
            },
            options: session ? { session } : undefined
        })
    }

    return cart
}

export const CartRepository = {
    async findByUserId(userId, options = {}) {
        const cart = await applySession(Cart.findOne({ user: userId }), options.session)

        if (!options.populate) {
            return cart
        }

        return populateCartDocument(cart, options.session)
    },

    async findOrCreateByUserId(userId, options = {}) {
        let cart = await applySession(Cart.findOne({ user: userId }), options.session)

        if (!cart) {
            cart = new Cart({
                user: userId,
                items: []
            })
            await cart.save(getSaveOptions(options.session))
        }

        if (!options.populate) {
            return cart
        }

        return populateCartDocument(cart, options.session)
    },

    save(cart, options = {}) {
        return cart.save(getSaveOptions(options.session))
    },

    removeItemsByProductIds(productIds, options = {}) {
        if (!Array.isArray(productIds) || productIds.length === 0) {
            return Promise.resolve({ acknowledged: true, modifiedCount: 0 })
        }

        return applySession(
            Cart.updateMany(
                {},
                {
                    $pull: {
                        items: {
                            product: { $in: productIds }
                        }
                    }
                }
            ),
            options.session
        )
    }
}
