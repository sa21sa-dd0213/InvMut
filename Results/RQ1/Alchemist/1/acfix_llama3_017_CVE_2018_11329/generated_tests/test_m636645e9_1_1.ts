import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test", function () {
  it("should kill mutant m636645e9 by testing calculateTrade returns non-zero value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the return statement from calculateTrade, so it will return 0
    // Call calculateTrade with non-zero inputs and expect a non-zero result
    const rt = ethers.parseEther("1");
    const rs = ethers.parseEther("100");
    const bs = ethers.parseEther("50");
    
    const result = await instance.calculateTrade(rt, rs, bs);
    
    // The original contract returns a non-zero value, the mutant returns 0
    expect(result).to.not.equal(0);
  });
});