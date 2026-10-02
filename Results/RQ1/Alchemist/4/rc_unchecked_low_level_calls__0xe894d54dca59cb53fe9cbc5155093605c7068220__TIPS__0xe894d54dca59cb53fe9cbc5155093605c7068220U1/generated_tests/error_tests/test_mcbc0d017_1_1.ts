import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant mcbc0d017 - empty array test", function () {
  it("should revert when _tos array is empty on original, but pass on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = addr2.address; // using a dummy token address
    const emptyAddresses: string[] = [];
    const value = 100;
    const decimals = 0;

    // This call should revert on the original (require(_tos.length > 0))
    // but will pass on the mutant (require(_tos.length >= 0))
    await expect(
      instance.transfer(owner.address, tokenAddress, emptyAddresses, value, decimals)
    ).to.be.reverted;
  });
});