import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m6664b8ec - allowance return value", function () {
  it("should detect mutant that removes return statement in allowance function", async function () {
    const [owner, spender] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, need to initialize the contract by calling NETM() as owner
    await instance.connect(owner).NETM();
    
    // Approve spender for a specific amount
    const approveAmount = ethers.parseEther("1000");
    await instance.connect(owner).approve(spender.address, approveAmount);
    
    // Now call allowance and check that it returns the approved amount
    const allowanceResult = await instance.allowance(owner.address, spender.address);
    
    // The original contract returns the actual allowance value
    // The mutant (without return statement) returns 0
    expect(allowanceResult).to.equal(approveAmount);
  });
});