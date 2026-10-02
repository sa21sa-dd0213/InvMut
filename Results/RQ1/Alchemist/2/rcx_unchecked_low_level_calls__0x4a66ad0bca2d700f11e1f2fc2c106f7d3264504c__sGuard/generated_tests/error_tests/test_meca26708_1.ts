import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - meca26708", function () {
  it("should revert when calling transfer because from is address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify the mutant changed from to address(0)
    const fromAddress = await instance.from();
    expect(fromAddress).to.equal(ethers.ZeroAddress);
    
    // Prepare test data
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token unit
    
    // Attempt to call transfer - should revert because transferFrom from address(0) will fail
    // The require(msg.sender == 0x9797...) will pass since owner matches
    await expect(
      instance.connect(owner).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});