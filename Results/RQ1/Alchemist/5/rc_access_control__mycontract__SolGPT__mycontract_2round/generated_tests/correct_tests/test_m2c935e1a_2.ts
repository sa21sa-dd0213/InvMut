import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection - m2c935e1a", function () {
  it("should revert when owner calls sendTo due to mutated != check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");

    // On the original: owner can call successfully (require(msg.sender == owner) passes)
    // On the mutant: owner's call reverts (require(msg.sender != owner) fails because owner == owner)
    // Therefore, expecting a revert will pass on the mutant but fail on the original.
    // This test will "kill" the mutant by failing on the original (since original would succeed).
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});