import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - md35c0594", function () {
  it("should revert when tos and vs arrays have different lengths (original contract behavior)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for the transferFrom test
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Prepare arrays with different lengths
    const tos = [addr1.address, addr2.address]; // 2 addresses
    const vs = [ethers.parseEther("100")];      // 1 value

    // The mutant removes the length check, so it would not revert
    // The original contract should revert because lengths don't match
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});