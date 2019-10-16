const { Security } = require('../models');
const { to, ReE, ReS } = require('../services/util.service');

// function create security
const create = async function (req, res) {
    let err, security;

    let security_info = req.body;

    [err, security] = await to(Security.create(security_info));
    if (err) return ReE(res, err, 422);

    return ReS(res, { message: 'Successfully created new security.', security: security.toWeb()}, 201);
}
module.exports.create = create;

// function get security by id
const get = async function (req, res) {
    let security, security_id, err;
    security_id = req.params.security_id;

    [err, security] = await to(Security.findOne({ where: { id: security_id } }));
    if (err) return ReE(res, "err finding security");
    if (!security) return ReE(res, "security not found with id: " + security_id);

    return ReS(res, { security: security.toWeb() });
}
module.exports.get = get;

// function get security by user id
const getByUserId = async function (req, res) {
    let security, user_id, err;
    user_id = req.params.user_id;


    [err, security] = await to(Security.findOne({ where: { userId: user_id } }));
    if (err) return ReE(res, "err finding security");
    if (!security) return ReE(res, "security not found");

    return ReS(res, { security: security.toWeb() });
}
module.exports.getByUserId = getByUserId;

// function get securities
const getAll = async function (req, res) {
    let securities;

    [err, securities] = await to(Security.findAll({ raw: true }));

    return ReS(res, { securities: securities });
}
module.exports.getAll = getAll;

// function update security
const update = async function (req, res) {
    let security, security_id, data, err;
    security_id = req.params.security_id;

    data = req.body;

    [err, security] = await to(Security.findOne({ where: { id: security_id } }));
    if (err) return ReE(res, "err finding security");
    if (!security) return ReE(res, "security not found with id: " + security_id);

    security.set(data);

    [err, security] = await to(security.save());
    if (err) {
        if (err.message == 'Validation error') err = 'The email address or phone number is already in use';
        return ReE(res, err);
    }
    return ReS(res, { message: 'Updated security'});
}
module.exports.update = update;

// function delete security
const remove = async function (req, res) {
    let security, security_id, err;
    security_id = req.params.security_id;

    [err, security] = await to(Security.findOne({ where: { id: security_id } }));
    if (err) return ReE(res, "err finding security");
    if (!security) return ReE(res, "security not found with id: " + security_id);

    [err, security] = await to(security.destroy());
    if (err) return ReE(res, 'error occured trying to delete security');

    return ReS(res, { message: 'Deleted security' });
}
module.exports.remove = remove;