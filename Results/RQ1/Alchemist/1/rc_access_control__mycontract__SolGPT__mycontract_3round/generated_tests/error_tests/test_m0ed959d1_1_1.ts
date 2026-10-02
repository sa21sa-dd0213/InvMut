import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection test", function () {
  it("should revert when calling sendTo with a non-zero address on the mutant (where require(receiver == address(0)) is used instead of require(receiver != address(0)))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    
    // In the original contract, this call would succeed (receiver != address(0) passes)
    // In the mutant, it reverts because require(receiver == address(0)) fails
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});