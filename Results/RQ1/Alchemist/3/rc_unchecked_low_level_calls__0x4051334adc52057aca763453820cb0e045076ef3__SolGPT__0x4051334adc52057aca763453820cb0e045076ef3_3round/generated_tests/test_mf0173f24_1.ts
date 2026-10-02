import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant mf0173f24)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the require(_tos.length > 0) check.
    // Original reverts when _tos is empty; mutant returns true.
    // This test expects a revert, which will pass on original and fail on mutant.
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [], // empty _tos array
        100
      )
    ).to.be.reverted;
  });
});