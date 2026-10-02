import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - m2fcbabde", function () {
  it("should revert when non-owner calls withdrawAll (kills mutant that removes require check)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract so there's balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attacker (non-owner) tries to withdraw - should revert in original, but mutant would allow it
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});