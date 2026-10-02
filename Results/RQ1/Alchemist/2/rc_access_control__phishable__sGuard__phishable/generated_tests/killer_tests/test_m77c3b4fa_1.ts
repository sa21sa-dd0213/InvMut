import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - m77c3b4fa", function () {
  it("should revert when non-owner calls withdrawAll (original behavior) but mutant allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract with owner as the initial owner
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH for the test
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attempt to call withdrawAll from attacker (non-owner) address
    // Original contract would revert; mutant will not revert (killing condition)
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});