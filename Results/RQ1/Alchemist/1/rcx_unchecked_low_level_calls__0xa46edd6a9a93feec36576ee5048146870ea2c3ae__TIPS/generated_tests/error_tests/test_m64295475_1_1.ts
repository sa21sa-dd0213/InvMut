import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6)", function () {
  it("should revert when _tos array is empty (kill mutant m64295475)", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = ethers.ZeroAddress; // using zero address as dummy address
    const emptyTos: string[] = [];
    const emptyVals: bigint[] = [];

    // Original contract reverts on require(_tos.length > 0) with empty array
    // Mutant allows require(_tos.length >= 0) which passes for empty array
    await expect(
      instance.transfer(from.address, tokenAddress, emptyTos, emptyVals)
    ).to.be.reverted;
  });
});