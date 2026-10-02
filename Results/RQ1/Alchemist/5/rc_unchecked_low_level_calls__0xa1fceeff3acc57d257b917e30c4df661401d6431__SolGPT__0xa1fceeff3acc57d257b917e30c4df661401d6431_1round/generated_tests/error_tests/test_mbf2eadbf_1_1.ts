import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - kill mbf2eadbf", function () {
  it("should revert when vs array is empty but tos array is non-empty (original behavior)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Prepare test data: non-empty tos array but empty vs array
    const tos = [await addr1.getAddress()];
    const vs: bigint[] = [];

    // This should revert in original because require(vs.length > 0) fails
    // Mutant removes this check, so it would pass - killing the mutant
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});