import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m7f69afb6 test", function () {
  it("should revert when called from unauthorized address due to require(msg.sender) check", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed based on the contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup test data - one recipient and one value
    const recipients = [unauthorized.address];
    const values = [ethers.parseEther("1")];
    
    // Attempt to call transfer from an unauthorized address
    // In the original contract, this should revert because msg.sender is not 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // In the mutant, this check is removed, so the call would succeed (killing the mutant)
    await expect(
      instance.connect(unauthorized).transfer(recipients, values)
    ).to.be.reverted;
  });
});