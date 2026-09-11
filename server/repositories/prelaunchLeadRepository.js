export function createPrelaunchLeadRepository(database) {
  const reviewFields = {
    id: true,
    requestType: true,
    name: true,
    email: true,
    organization: true,
    country: true,
    role: true,
    interest: true,
    organizationType: true,
    timing: true,
    note: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  };
  return {
    create(data) {
      return database.prelaunchLead.create({ data });
    },
    list(filters = {}) {
      return database.prelaunchLead.findMany({
        where: {
          ...(filters.requestType ? { requestType: filters.requestType } : {}),
          ...(filters.country ? { country: { equals: filters.country, mode: "insensitive" } } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
        select: reviewFields,
        orderBy: { createdAt: "desc" },
        take: 250,
      });
    },
    findById(id) {
      return database.prelaunchLead.findUnique({ where: { id }, select: reviewFields });
    },
    async updateStatus(id, status) {
      const result = await database.prelaunchLead.updateMany({ where: { id }, data: { status } });
      return result.count
        ? database.prelaunchLead.findUnique({ where: { id }, select: reviewFields })
        : null;
    },
  };
}
