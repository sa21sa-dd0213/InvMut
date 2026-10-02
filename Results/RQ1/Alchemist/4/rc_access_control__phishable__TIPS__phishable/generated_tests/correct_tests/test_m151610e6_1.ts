import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m151610e6 test", function () {
  it("should allow deployer to withdraw funds after deployment", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract - in the original, owner = _owner (deployer)
    // In the mutant, owner = address(this) (the contract itself)
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // Attempt to withdraw as the deployer - should succeed in original
    // but fail in mutant since owner is the contract address, not deployer
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.not.be.reverted;
  });
});