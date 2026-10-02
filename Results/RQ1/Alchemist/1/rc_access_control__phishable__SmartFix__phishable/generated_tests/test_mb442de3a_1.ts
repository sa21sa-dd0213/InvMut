import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant mb442de3a", function () {
  it("should revert when owner calls withdrawAll due to inverted require condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract with owner as the constructor argument
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether to make the withdrawal meaningful
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Owner attempts to withdraw - in original this succeeds, in mutant it reverts
    // because mutant requires msg.sender != owner
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});