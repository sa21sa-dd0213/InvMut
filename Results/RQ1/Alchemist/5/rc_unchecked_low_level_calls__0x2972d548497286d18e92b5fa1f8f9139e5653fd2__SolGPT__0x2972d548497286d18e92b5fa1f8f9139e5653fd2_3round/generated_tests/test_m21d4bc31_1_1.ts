import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo - kill mutant m21d4bc31", function () {
  it("should revert when external call fails, mutant should not revert", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock contract that always fails on transferFrom
    const FailFactory = await ethers.getContractFactory("FailingContract");
    const failContract = await FailFactory.deploy();
    await failContract.waitForDeployment();

    // Deploy the demo contract
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();

    // Prepare test data
    const tos = [owner.address];
    const values = [100];

    // Call transfer with the failing contract address
    // Original should revert, mutant should not revert
    await expect(
      demo.transfer(owner.address, await failContract.getAddress(), tos, values)
    ).to.be.reverted;
  });
});

// Helper contract that always fails on transferFrom
contract FailingContract {
  function transferFrom(address, address, uint256) external pure returns (bool) {
    return false;
  }
}