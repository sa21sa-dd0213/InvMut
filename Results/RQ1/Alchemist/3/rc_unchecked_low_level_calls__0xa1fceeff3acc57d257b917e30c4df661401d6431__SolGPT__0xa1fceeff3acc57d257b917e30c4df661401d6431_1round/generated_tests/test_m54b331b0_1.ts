import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection", function () {
  it("should revert when vs array is empty on original, but pass on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Test with empty arrays - should revert on original but pass on mutant
    await expect(
      instance.transfer(
        await token.getAddress(),
        [],
        []
      )
    ).to.be.reverted;
  });
});