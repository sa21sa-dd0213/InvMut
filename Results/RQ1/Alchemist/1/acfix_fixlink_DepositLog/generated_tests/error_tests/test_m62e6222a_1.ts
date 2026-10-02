import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m62e6222a - logFunded authorization check", function () {
  it("should revert or return false when unapproved address calls logFunded", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not an approved logger, so calling logFunded should return false
    const result = await instance.connect(addr1).logFunded();
    
    // The original contract returns false for unapproved callers
    // The mutant will return true (emit event) which would fail this assertion
    expect(result).to.equal(false);
  });
});