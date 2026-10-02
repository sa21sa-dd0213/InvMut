import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m7db7addf", function () {
  it("should revert when loop runs out of bounds due to i <= tos.length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that the contract can call transferFrom on
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens from owner
    const approveAmount = ethers.parseEther("100");
    await token.approve(await instance.getAddress(), approveAmount);

    // Fund the owner with tokens
    await token.mint(owner.address, approveAmount);

    // Prepare arrays with exactly one element each
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // The original contract would succeed (loop i=0 only)
    // The mutant with i <= tos.length will try i=1, which is out of bounds, causing revert
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});