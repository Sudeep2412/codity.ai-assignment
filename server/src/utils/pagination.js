function getPaginationParams(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(Math.min(parseInt(query.limit, 10) || 20, 100), 1);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function getPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = {
  getPaginationParams,
  getPaginationMeta
};
