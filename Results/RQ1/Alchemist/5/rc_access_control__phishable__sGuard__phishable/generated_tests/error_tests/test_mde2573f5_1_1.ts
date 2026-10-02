import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - constructor sets owner to address(this)", function () {
  it("should revert when owner calls withdrawAll because owner is the contract itself", async function () {
    const [deployer, attacker] = await ethers.getSigners();

    // Deploy with any address as constructor argument (mutant ignores it)
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(deployer.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await deployer.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to withdraw from the deployer address (should revert in mutant)
    await expect(
      instance.connect(deployer).withdrawAll(deployer.address)
    ).to.be.reverted;
  });
});