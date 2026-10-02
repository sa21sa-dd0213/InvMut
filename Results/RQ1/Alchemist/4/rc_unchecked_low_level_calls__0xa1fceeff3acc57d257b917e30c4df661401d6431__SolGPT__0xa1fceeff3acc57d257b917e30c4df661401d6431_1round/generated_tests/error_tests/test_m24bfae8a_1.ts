import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m24bfae8a test", function () {
  it("should revert when tos and vs arrays have different lengths (mutant changes == to !=)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare equal-length arrays (this should succeed on original, fail on mutant)
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("10"), ethers.parseEther("20")];

    // On the mutant, require(tos.length != vs.length) will revert because lengths are equal
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});