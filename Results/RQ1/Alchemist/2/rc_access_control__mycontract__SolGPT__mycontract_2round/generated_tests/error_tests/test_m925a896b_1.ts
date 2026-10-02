import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant m925a896b", function () {
  it("should revert when sending to zero address (original behavior) and fail on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send ether to zero address - should revert in original contract
    // due to require(receiver != address(0)), but mutant removes this check
    await expect(
      instance.sendTo(ethers.ZeroAddress, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});