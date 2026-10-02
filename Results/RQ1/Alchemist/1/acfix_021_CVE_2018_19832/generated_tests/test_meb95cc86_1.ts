import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant meb95cc86 (allowance)", function () {
  it("should detect mutated allowance function by verifying correct allowance value after approval", async function () {
    const [owner, spender] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, approve a specific allowance for the spender
    const approveAmount = ethers.parseEther("100");
    const approveTx = await instance.connect(owner).approve(spender.address, approveAmount);
    await approveTx.wait();
    
    // Now call allowance to verify it returns the approved amount
    const allowanceResult = await instance.connect(owner).allowance(owner.address, spender.address);
    
    // The original function returns allowed[owner][spender]
    // If mutant changed this behavior (e.g., returns 0 or different value), this assertion will fail
    expect(allowanceResult).to.equal(approveAmount);
  });
});