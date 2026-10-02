import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mbcd114a6 test", function () {
  it("should revert when one of the transferFrom calls fails", async function () {
    const [owner, from, recipient] = await ethers.getSigners();

    // Deploy a mock token that will fail on transferFrom
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();

    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data - one valid recipient and one that will cause failure
    const tos = [recipient.address, ethers.ZeroAddress]; // ZeroAddress will cause transferFrom to fail
    const amounts = [ethers.parseEther("10"), ethers.parseEther("5")];

    // Expect revert because the second transferFrom call should fail
    await expect(
      instance.transfer(from.address, await mockToken.getAddress(), tos, amounts)
    ).to.be.reverted;
  });
});