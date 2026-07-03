const db = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

class ProjectService {
  async getProjects(query) {
    const { limit, offset, page } = getPaginationParams(query);
    
    let baseQuery = db('projects');
    
    if (query.org_id) {
      baseQuery = baseQuery.where('organization_id', query.org_id);
    }
    
    const totalRes = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalRes.count, 10);
    
    const projects = await baseQuery
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);
      
    return {
      data: projects,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  async getProject(id) {
    const project = await db('projects').where({ id }).first();
    if (!project) throw new NotFoundError('Project not found');
    return project;
  }

  async createProject(data) {
    const [project] = await db('projects').insert({
      organization_id: data.organization_id,
      name: data.name,
      description: data.description
    }).returning('*');
    return project;
  }

  async updateProject(id, data) {
    const [project] = await db('projects')
      .where({ id })
      .update({
        name: data.name,
        description: data.description,
        updated_at: new Date()
      })
      .returning('*');
      
    if (!project) throw new NotFoundError('Project not found');
    return project;
  }

  async deleteProject(id) {
    const deleted = await db('projects').where({ id }).delete();
    if (!deleted) throw new NotFoundError('Project not found');
    return true;
  }
}

module.exports = new ProjectService();
