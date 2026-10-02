import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - m3f8e0a63", function () {
  it("should revert when external call fails, but mutant allows it to pass", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that will revert on transferFrom
    const ReverterFactory = await ethers.getContractFactory("Reverter");
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    // Prepare test data: array of recipients (one is enough)
    const recipients = [addr2.address];
    const value = ethers.parseEther("1");

    // Attempt the transfer to the reverter contract address
    // The reverter will cause the external call to fail
    // In original: transaction reverts
    // In mutant: transaction succeeds (returns true) - this should make the test fail
    await expect(
      instance.transfer(owner.address, reverter.target, recipients, value)
    ).to.be.reverted;
  });
});

// Helper contract that reverts on any call
contract Reverter {
  fallback() external payable {
    revert("always revert");
  }
}