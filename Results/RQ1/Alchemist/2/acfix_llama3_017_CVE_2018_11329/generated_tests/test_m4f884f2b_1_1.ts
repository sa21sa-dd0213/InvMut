import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - collectDrugs without initialization", function () {
  it("should revert when collectDrugs is called before seedMarket", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EtherCartel)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Attempt to call collectDrugs before seedMarket has been called
    // The original contract should revert because initialized is false
    await expect(
      instance.connect(addr1).collectDrugs(addr2.address)
    ).to.be.reverted;
  });
});