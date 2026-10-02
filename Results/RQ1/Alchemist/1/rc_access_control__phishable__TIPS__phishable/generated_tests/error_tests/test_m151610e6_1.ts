import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Phishable mutant m151610e6 test", function () {
  it("should kill mutant by verifying owner is set to deployer, not contract itself", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with owner as deployer
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attempt to withdrawAll as owner - should succeed in original, revert in mutant
    // because mutant sets owner to address(this) instead of _owner
    await expect(
      instance.connect(owner).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});