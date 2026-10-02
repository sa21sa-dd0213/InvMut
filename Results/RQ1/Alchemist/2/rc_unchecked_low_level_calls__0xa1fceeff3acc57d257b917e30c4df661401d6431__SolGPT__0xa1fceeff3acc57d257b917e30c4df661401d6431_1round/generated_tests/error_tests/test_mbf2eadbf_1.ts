import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mbf2eadbf test", function () {
  it("should revert when vs array is empty but tos array is not empty (missing vs.length > 0 check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address for transferFrom call
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund owner with tokens and approve the AirDropContract to transferFrom
    await token.transfer(owner.address, ethers.parseEther("100"));
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Setup: non-empty tos array but empty vs array
    const tos = [addr1.address, addr2.address];
    const vs: bigint[] = [];

    // Expect revert because original requires vs.length > 0, mutant removed that check
    // This test should fail on mutant because it will proceed and revert on the call attempt
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});