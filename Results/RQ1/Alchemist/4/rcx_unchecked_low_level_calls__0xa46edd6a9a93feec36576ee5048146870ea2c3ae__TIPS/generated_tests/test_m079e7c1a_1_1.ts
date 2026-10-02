import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m079e7c1a", function () {
  it("should revert when a transferFrom call fails (kills mutant that replaces !_s with false)", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that always fails on transferFrom
    const FailingTokenFactory = await ethers.getContractFactory(
      "contract FailingToken { function transferFrom(address, address, uint256) external pure returns (bool) { return false; } }"
    );
    const failingToken = await FailingTokenFactory.deploy();
    await failingToken.waitForDeployment();

    // Prepare test data
    const tos = [to.address];
    const values = [ethers.parseEther("1")];

    // This call should revert because the external call returns false
    // The original reverts, the mutant (with `if (false)`) does not revert
    await expect(
      instance.transfer(from.address, failingToken.target, tos, values)
    ).to.be.reverted;
  });
});