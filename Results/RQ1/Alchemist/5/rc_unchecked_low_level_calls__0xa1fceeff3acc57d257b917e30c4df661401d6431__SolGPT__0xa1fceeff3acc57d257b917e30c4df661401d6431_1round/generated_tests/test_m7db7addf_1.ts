import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m7db7addf", function () {
  it("should kill mutant by causing out-of-bounds access with single element arrays", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that the contract can call transferFrom on
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund the owner with tokens and approve the AirDropContract
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Prepare single-element arrays
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];
    
    // On the original contract, this would succeed (loop runs once for i=0)
    // On the mutant, loop runs for i=0 and i=1, causing out-of-bounds revert
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});