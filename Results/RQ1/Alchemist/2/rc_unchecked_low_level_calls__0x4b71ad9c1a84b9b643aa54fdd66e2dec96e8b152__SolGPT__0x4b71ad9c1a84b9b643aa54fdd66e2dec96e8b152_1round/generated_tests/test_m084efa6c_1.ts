import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when external call fails (mutant missing require)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that will always fail on transferFrom
    const FailFactory = await ethers.getContractFactory("contract FailOnCall { function transferFrom(address, address, uint256) external pure returns (bool) { return false; } }");
    const failContract = await FailFactory.deploy();
    await failContract.waitForDeployment();

    // Prepare test parameters
    const from = owner.address;
    const tos = [addr1.address];
    const value = ethers.parseEther("1");

    // The call should revert because the external call returns false
    await expect(
      instance.transfer(from, await failContract.getAddress(), tos, value)
    ).to.be.reverted;
  });
});