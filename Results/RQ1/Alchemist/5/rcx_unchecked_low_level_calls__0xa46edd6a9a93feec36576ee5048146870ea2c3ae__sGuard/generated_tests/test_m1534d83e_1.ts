import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m1534d83e", function () {
  it("should revert when called with a non-empty array because require(_tos.length < 0) is always false", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [recipient.address];
    const values = [ethers.parseEther("1")];

    await expect(
      instance.transfer(from.address, ethers.ZeroAddress, tos, values)
    ).to.be.reverted;
  });
});