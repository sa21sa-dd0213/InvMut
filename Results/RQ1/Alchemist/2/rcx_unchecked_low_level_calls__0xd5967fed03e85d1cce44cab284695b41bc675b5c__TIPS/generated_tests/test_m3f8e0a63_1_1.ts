import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m3f8e0a63 - disable revert on failed external call", function () {
  it("should revert when external call fails, but mutant does not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the main demo contract (no constructor arguments)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();

    // Deploy a simple contract that will fail on transferFrom call
    const FailingTarget = await ethers.getContractFactory(
      "contract FailingTarget { function transferFrom(address, address, uint256) external pure returns (bool) { revert('always fails'); } }"
    );
    const failingTarget = await FailingTarget.deploy();
    await failingTarget.waitForDeployment();

    const tos = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");

    // This call should revert in the original but NOT in the mutant
    // We expect the original to revert, so we check that the tx reverts
    // If mutant doesn't revert, the test will fail (detecting the mutant)
    await expect(
      demo.transfer(owner.address, failingTarget.target, tos, value)
    ).to.be.revertedWith("always fails");
  });
});