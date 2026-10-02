import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m3970de55 test", function () {
  it("should revert when external transferFrom call fails", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a mock token that will fail on transferFrom
    const MockTokenFactory = await ethers.getContractFactory("contracts/MockToken.sol:MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();

    // Deploy the airDrop contract (no constructor args)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Prepare test parameters
    const _tos = [to.address];
    const v = 100;
    const _decimals = 18;

    // Attempt the transfer - should revert because mock token's transferFrom returns false
    await expect(
      airDrop.transfer(from.address, await mockToken.getAddress(), _tos, v, _decimals)
    ).to.be.reverted;
  });
});