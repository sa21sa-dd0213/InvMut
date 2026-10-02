import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6)", function () {
  it("should revert when _tos array length is valid (non-zero) on the mutant due to < 0 condition always failing", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const value = ethers.parseEther("1");

    // On the original contract this would succeed, on the mutant it reverts because require(_tos.length < 0) always fails
    await expect(
      instance.transfer(owner.address, owner.address, tos, value)
    ).to.be.reverted;
  });
});