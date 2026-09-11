export function createPrelaunchLeadRepository(database) {
  return {
    create(data) {
      return database.prelaunchLead.create({ data });
    },
  };
}
