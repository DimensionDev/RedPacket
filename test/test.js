const chai = require('chai');
const expect = chai.expect
chai.use(require('chai-as-promised'))
const assert = require('assert');
describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', async () => {
      assert.equal([1, 2, 3].indexOf(4), 1);
    });
  });
});

function sleep() {
  return new Promise((resolve) => setTimeout(() => resolve(1000), 1500))
}