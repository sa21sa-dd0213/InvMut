import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - mde2573f5", function () {
  it("should detect mutant that sets owner to address(this) instead of _owner", async function () {
    const [deployer, attacker] = await ethers.getSigners();
    
    // Deploy the contract with deployer as the constructor argument
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(deployer.address);
    await instance.waitForDeployment();

    // On the original contract, deployer is owner and can withdraw
    // On the mutant, owner is address(this) so deployer's call should revert
    await expect(
      instance.connect(deployer).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});