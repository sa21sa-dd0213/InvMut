import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - m77c3b4fa", function () {
  it("should revert when withdrawAll is called from an unauthorized address", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract with owner
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract with some ether for withdrawal
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attempt to call withdrawAll from an unauthorized address - should revert in original
    await expect(
      instance.connect(unauthorized).withdrawAll(unauthorized.address)
    ).to.be.reverted;
  });
});