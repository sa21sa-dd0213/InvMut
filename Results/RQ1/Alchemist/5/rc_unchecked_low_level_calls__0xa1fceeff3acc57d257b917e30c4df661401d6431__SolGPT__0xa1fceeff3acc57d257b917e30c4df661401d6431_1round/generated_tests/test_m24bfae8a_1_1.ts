import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should succeed when tos and vs have equal length, killing the mutant that requires != lengths", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare arrays of equal length (1 element each)
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];

    // This should succeed on original (lengths equal), revert on mutant (which requires !=)
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.not.be.reverted;
  });
});