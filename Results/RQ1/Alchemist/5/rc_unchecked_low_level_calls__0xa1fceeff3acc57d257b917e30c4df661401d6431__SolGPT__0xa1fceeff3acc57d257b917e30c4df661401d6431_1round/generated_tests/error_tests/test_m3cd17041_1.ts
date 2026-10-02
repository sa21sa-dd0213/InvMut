import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant kill test - m3cd17041", function () {
  it("should revert when tos array is empty on original but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing the transfer function
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Empty arrays - this should revert on original but pass on mutant
    await expect(
      instance.transfer(
        await token.getAddress(),
        [],
        []
      )
    ).to.be.reverted;
  });
});