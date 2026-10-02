import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending to zero address (kills mutant that removes zero-address check)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const zeroAddress = ethers.ZeroAddress;
    const amount = ethers.parseEther("1");

    // This should revert on the original contract because of the require(receiver != address(0)) check
    // On the mutant where this check is removed, it will NOT revert, thus killing the mutant
    await expect(
      instance.connect(owner).sendTo(zeroAddress, amount)
    ).to.be.reverted;
  });
});