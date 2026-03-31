import Order from '../models/Order.js'

function applySession(query, session) {
    return session ? query.session(session) : query
}

function getSaveOptions(session) {
    return session ? { session } : undefined
}

export const OrderRepository = {
    async create(payload, options = {}) {
        const order = new Order(payload)
        await order.save(getSaveOptions(options.session))
        return order
    },

    findById(orderId, options = {}) {
        return applySession(Order.findById(orderId), options.session)
    },

    list(filters = {}, options = {}) {
        return applySession(
            Order.find(filters).sort({ createdAt: -1 }),
            options.session
        )
    },

    markAllSeen(options = {}) {
        return applySession(
            Order.updateMany(
                {
                    isUnread: true
                },
                {
                    $set: {
                        isUnread: false,
                        reviewedAt: new Date()
                    }
                }
            ),
            options.session
        )
    },

    deleteById(orderId, options = {}) {
        return applySession(Order.findByIdAndDelete(orderId), options.session)
    },

    updateById(orderId, updates, options = {}) {
        return applySession(
            Order.findByIdAndUpdate(orderId, updates, {
                new: true,
                runValidators: true
            }),
            options.session
        )
    },

    updateEmailNotification(orderId, emailNotification, options = {}) {
        return applySession(
            Order.findByIdAndUpdate(orderId, {
                emailNotification
            }),
            options.session
        )
    }
}
