import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m36fe12f1 test", function () {
  it("should revert when tos.length > 0 because mutant requires tos.length < 0 (impossible)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20 token to use as contract_address (needs transferFrom)
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // tos array with one element (length > 0)
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];

    // Original would succeed; mutant will revert because tos.length < 0 is always false
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});