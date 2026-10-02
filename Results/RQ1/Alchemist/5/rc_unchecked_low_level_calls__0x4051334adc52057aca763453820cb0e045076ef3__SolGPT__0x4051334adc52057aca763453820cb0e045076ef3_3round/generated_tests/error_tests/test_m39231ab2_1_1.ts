import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant kill test - m39231ab2", function () {
  it("should revert when _tos array is empty (kill mutant that uses >= 0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty address array
    const emptyAddresses: string[] = [];

    // Call transfer with empty _tos array - should revert on original, pass on mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, 100)
    ).to.be.reverted;
  });
});