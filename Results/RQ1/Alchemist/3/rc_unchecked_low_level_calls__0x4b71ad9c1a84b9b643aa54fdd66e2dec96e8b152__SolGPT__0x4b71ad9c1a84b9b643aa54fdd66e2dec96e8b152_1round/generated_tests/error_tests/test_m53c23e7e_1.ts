import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6)", function () {
  it("should revert when _tos array is empty (original behavior); mutant passes incorrectly", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock token address (any EOA works for the call)
    const tokenAddress = addr1.address;
    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // The original contract reverts on empty array, mutant does not
    await expect(
      instance.transfer(owner.address, tokenAddress, emptyAddresses, value)
    ).to.be.reverted;
  });
});