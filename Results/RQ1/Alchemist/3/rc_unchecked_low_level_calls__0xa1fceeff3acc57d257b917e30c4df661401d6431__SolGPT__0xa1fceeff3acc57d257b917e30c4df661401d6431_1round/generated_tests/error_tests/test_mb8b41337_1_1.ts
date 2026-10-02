import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mb8b41337 test", function () {
  it("should revert when tos array is empty due to missing require check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Attempt transfer with empty tos array and empty vs array
    await expect(
      instance.transfer(
        await token.getAddress(),
        [],
        []
      )
    ).to.be.reverted;
  });
});