import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection - m2c935e1a", function () {
  it("should revert when owner calls sendTo due to mutated != check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    
    // Owner calling sendTo should succeed on original but fail on mutant
    // because mutant requires msg.sender != owner, so owner's call reverts
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});