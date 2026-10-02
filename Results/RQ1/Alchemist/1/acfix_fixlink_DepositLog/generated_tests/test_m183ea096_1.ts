import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m183ea096 - kill test", function () {
  it("should allow only owner to call setApprovedLogger - owner call should succeed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner should be able to call setApprovedLogger
    await expect(instance.connect(owner).setApprovedLogger(addr1.address, true)).to.not.be.reverted;
    
    // Verify the logger was actually approved
    expect(await instance.approvedLoggers(addr1.address)).to.equal(true);
  });
});