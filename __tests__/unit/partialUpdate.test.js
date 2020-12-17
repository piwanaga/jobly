const partialUpdate = require('../../helpers/partialUpdate')

describe("partialUpdate()", () => {
  it("should generate a proper partial update query with just 1 field",
    function () {
      const query = partialUpdate("table1", {test_col: "updated_value"}, "user", "testUser")
    
      expect(query.query).toEqual(`UPDATE table1 SET test_col=$1 WHERE user=$2 RETURNING *`);
      expect(query.values).toEqual(["updated_value", "testUser"])
  });
});
