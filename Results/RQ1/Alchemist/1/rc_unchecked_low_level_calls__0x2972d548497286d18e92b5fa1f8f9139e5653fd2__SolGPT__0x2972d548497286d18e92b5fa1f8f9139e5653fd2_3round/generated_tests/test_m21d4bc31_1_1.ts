import { expect } from "chai";
import { ethers } from "hardhat";

describe("kill mutant m21d4bc31 - remove require(_s)", function () {
  it("should revert when external call fails in original, but pass in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that will revert on transferFrom
    const ReverterFactory = await ethers.getContractFactory(
      "contract Reverter { function transferFrom(address, address, uint256) external pure returns (bool) { revert('always fails'); } }"
    );
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    const tos = [addr1.address];
    const vals = [100];

    // The original contract would revert because the call fails
    // The mutant would not check the return value and succeed
    await expect(
      instance.transfer(owner.address, await reverter.getAddress(), tos, vals)
    ).to.be.reverted;
  });
});