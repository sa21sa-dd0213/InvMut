import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2f773d10", function () {
  it("should revert when called from the authorized address in the mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the authorized address from the contract
    const authorizedAddress = await instance.from();
    
    // Verify that owner matches authorized address for test setup
    // (owner is the first signer, which should be the deployer)
    
    // Prepare test data
    const recipients = [addr1.address, addr2.address];
    const amounts = [1, 2]; // in ETH units
    
    // Call transfer from the authorized address
    // In the original contract this should succeed
    // In the mutant (with !=) this should revert because msg.sender == authorized address
    await expect(
      instance.connect(owner).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});