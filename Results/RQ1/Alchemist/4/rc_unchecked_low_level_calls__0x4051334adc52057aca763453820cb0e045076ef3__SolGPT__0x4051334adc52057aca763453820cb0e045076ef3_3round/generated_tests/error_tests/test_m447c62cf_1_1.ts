import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m447c62cf detection", function () {
  it("should kill mutant by passing single-element array to transfer (out-of-bounds access)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments for airdrop)
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare a simple ERC20 token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund addr1 with tokens and approve the airdrop contract
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Create a single-element recipient array - this triggers the bug
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");
    
    // Call transfer - on original it succeeds, on mutant it reverts due to out-of-bounds
    await expect(
      instance.connect(addr1).transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});