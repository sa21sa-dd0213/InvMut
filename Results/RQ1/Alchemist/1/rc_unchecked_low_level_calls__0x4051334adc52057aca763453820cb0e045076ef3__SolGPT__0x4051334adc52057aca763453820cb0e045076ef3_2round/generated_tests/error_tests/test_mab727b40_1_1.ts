import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant test - mab727b40", function () {
  it("should detect mutant that changed > to < in _tos.length check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the airdrop contract to spend tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("10"));

    // Setup: owner has tokens, transfer to addr1
    const recipients = [addr1.address];
    const amount = ethers.parseEther("1");

    // Original contract: require(_tos.length > 0) passes with 1 recipient
    // Mutant: require(_tos.length < 0) fails because 1 < 0 is false
    await expect(
      instance.transfer(owner.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;
  });
});