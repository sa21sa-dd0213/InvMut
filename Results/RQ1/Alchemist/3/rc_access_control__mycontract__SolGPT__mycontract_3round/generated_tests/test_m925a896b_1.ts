import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection", function () {
  it("should revert when sending to address(0) - kills mutant that removes zero-address check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const amount = ethers.parseEther("1.0");

    await expect(
      instance.connect(owner).sendTo(zeroAddress, amount)
    ).to.be.reverted;
  });
});