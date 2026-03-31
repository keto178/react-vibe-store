import User from '../models/User.js'

function applySession(query, session) {
    return session ? query.session(session) : query
}

export const UserRepository = {
    findById(userId, options = {}) {
        return applySession(User.findById(userId), options.session)
    },

    findByEmail(email, options = {}) {
        return applySession(User.findOne({ email }), options.session)
    },

    findByEmailOrUsername({ email, username }, options = {}) {
        return applySession(
            User.findOne({
                $or: [
                    { email },
                    { username }
                ]
            }),
            options.session
        )
    },

    async create(payload, options = {}) {
        const user = new User(payload)
        await user.save(options.session ? { session: options.session } : undefined)
        return user
    },

    save(user, options = {}) {
        return user.save(options.session ? { session: options.session } : undefined)
    }
}
