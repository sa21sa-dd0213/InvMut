import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection - m24bfae8a", function () {
  it("should kill mutant by calling transfer with equal-length arrays", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Create two arrays with equal length (1 element each)
    const tos = [await addr1.getAddress()];
    const vs = [ethers.parseEther("10")];

    // This should pass on original (lengths equal) but revert on mutant (lengths equal triggers != revert)
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});