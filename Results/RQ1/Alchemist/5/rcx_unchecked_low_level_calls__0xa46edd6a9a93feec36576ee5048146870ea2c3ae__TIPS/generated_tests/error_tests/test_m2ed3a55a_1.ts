import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m2ed3a55a test", function () {
  it("should revert when calling transfer with a valid non-empty array due to mutant's impossible require condition", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare test data: non-empty array of recipients with corresponding values
    const recipients = [to.address];
    const values = [100];
    
    // The original contract would succeed with this input, but the mutant's 
    // require(_tos.length < 0) will always fail since array length is never negative
    await expect(
      instance.transfer(from.address, to.address, recipients, values)
    ).to.be.reverted;
  });
});