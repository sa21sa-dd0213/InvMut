import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m56b4c7cf test", function () {
  it("should allow Put with _lockTime = 0 (original passes, mutant reverts)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 wei with _lockTime = 0
    const tx = instance.Put(0, { value: 1 });

    // Original: succeeds; Mutant: reverts because block.timestamp + 0 > block.timestamp is false
    await expect(tx).to.not.be.reverted;
  });
});