import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when external call fails, but mutant silently succeeds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that will always revert on transferFrom
    const ReverterFactory = await ethers.getContractFactory("Reverter");
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    const tos = [addr1.address];
    const values = [100];

    // The call should revert because the reverter contract reverts on transferFrom
    await expect(
      instance.transfer(owner.address, await reverter.getAddress(), tos, values)
    ).to.be.reverted;
  });
});

// Helper contract that reverts on any call
contract Reverter {
  fallback() external payable {
    revert("always revert");
  }
}