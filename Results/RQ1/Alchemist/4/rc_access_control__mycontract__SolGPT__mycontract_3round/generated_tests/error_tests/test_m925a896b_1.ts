import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test - missing zero address check", function () {
  it("should revert when sending to address(0) in the original contract, but mutant would allow it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    const zeroAddress = ethers.ZeroAddress;

    // This should revert in the original contract because of the require(receiver != address(0)) check
    // The mutant removes that check, so it would NOT revert, killing the mutant
    await expect(
      instance.connect(owner).sendTo(zeroAddress, amount)
    ).to.be.reverted;
  });
});