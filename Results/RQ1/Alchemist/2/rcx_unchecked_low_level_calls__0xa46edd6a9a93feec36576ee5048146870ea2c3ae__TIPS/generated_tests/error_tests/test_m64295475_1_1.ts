import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (detects mutant that changed > to >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: create a token contract to use as caddress
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Give owner some tokens and approve the EBU contract
    await token.transfer(owner.address, ethers.parseEther("100"));
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Attempt to call transfer with empty _tos array - should revert in original
    await expect(
      instance.transfer(
        owner.address,
        await token.getAddress(),
        [],  // empty _tos array
        []   // empty v array
      )
    ).to.be.reverted;
  });
});