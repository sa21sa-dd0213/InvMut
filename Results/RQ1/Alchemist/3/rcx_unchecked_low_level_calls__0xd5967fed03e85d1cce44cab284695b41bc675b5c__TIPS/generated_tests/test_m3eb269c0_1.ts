import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant test - m3eb269c0", function () {
  it("should revert when _tos array is empty (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.be.reverted;
  });
});