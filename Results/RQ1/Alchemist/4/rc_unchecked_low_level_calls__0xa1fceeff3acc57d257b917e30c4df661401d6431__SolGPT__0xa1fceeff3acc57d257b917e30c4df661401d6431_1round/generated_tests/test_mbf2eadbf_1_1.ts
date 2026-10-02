import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mbf2eadbf test", function () {
  it("should revert when vs array is empty in original, but mutant should not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    const tos = [addr1.address];
    const vs: bigint[] = []; // Empty vs array, use bigint[] instead of string[]

    // This should revert on the original contract due to require(vs.length > 0)
    // The mutant removes that check, so it will not revert
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});