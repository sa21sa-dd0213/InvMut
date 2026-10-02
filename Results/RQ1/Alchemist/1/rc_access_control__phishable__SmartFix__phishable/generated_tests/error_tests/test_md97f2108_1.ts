import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant kill test - md97f2108", function () {
  it("should kill mutant by deploying with owner and then calling withdrawAll from that owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with owner as the deployer
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract with some ether for withdrawal
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();
    
    // In the original: owner is set to owner.address, so this succeeds
    // In the mutant: owner is set to address(this), so this should revert
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});