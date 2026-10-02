import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mb8b41337 test", function () {
  it("should revert when tos array is empty (original behavior)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund owner with tokens and approve AirDropContract
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call transfer with empty tos and vs arrays
    await expect(
      instance.transfer(
        await token.getAddress(),
        [],
        []
      )
    ).to.be.reverted;
  });
});