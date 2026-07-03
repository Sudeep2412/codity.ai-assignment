const db = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

class OrgService {
  async getOrganizations(query) {
    const { limit, offset, page } = getPaginationParams(query);
    
    let baseQuery = db('organizations');
    
    const totalRes = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalRes.count, 10);
    
    const orgs = await baseQuery
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);
      
    return {
      data: orgs,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  async getOrganization(id) {
    const org = await db('organizations').where({ id }).first();
    if (!org) throw new NotFoundError('Organization not found');
    return org;
  }

  async createOrganization(data) {
    const [org] = await db('organizations').insert({
      name: data.name,
    }).returning('*');
    return org;
  }

  async updateOrganization(id, data) {
    const [org] = await db('organizations')
      .where({ id })
      .update({
        name: data.name,
        updated_at: new Date()
      })
      .returning('*');
      
    if (!org) throw new NotFoundError('Organization not found');
    return org;
  }

  async deleteOrganization(id) {
    const deleted = await db('organizations').where({ id }).delete();
    if (!deleted) throw new NotFoundError('Organization not found');
    return true;
  }
}

module.exports = new OrgService();
