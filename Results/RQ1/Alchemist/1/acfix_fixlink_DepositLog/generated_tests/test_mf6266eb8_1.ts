import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant mf6266eb8 test", function () {
  let instance: any;
  let owner: any;
  let approvedLogger: any;

  beforeEach(async function () {
    [owner, approvedLogger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger address
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);
  });

  it("should return true and emit Created event when called by approved logger", async function () {
    // Call logCreated from the approved logger
    const tx = await instance.connect(approvedLogger).logCreated(owner.address);
    const receipt = await tx.wait();
    
    // Expect the function to return true
    const result = await instance.connect(approvedLogger).logCreated.staticCall(owner.address);
    expect(result).to.equal(true);
    
    // Expect the Created event to be emitted
    await expect(tx).to.emit(instance, "Created")
      .withArgs(approvedLogger.address, owner.address, receipt.blockTimestamp);
  });
});