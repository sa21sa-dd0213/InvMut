import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m5cbd6851 test", function () {
  it("should revert when external call fails, but mutant fails to revert", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy the airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Deploy a simple contract that will fail on transferFrom
    const FailTransfer = await ethers.getContractFactory(
      "contract FailTransfer { function transferFrom(address, address, uint256) external pure returns (bool) { return false; } }"
    );
    const failContract = await FailTransfer.deploy();
    await failContract.waitForDeployment();

    // Prepare test parameters
    const recipients = [to.address];
    const value = 1;
    const decimals = 0;

    // This call should revert because the external call returns false
    await expect(
      airDrop.transfer(from.address, failContract.target, recipients, value, decimals)
    ).to.be.reverted;
  });
});