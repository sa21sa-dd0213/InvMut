import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant ma1b89358 test", function () {
  it("should revert when transferFrom fails due to insufficient balance (original) but mutant returns true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the airdrop contract
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Mint tokens to addr1 and approve airdrop contract to spend from addr1
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await airdrop.getAddress(), ethers.parseEther("100"));
    
    // addr1 has enough balance for 1 recipient, but not for 3 recipients of 50 each
    const recipients = [addr2.address, addr2.address, addr2.address];
    const amount = ethers.parseEther("50");
    
    // This call should revert in original (require(_s) fails) but succeed in mutant
    // We expect it to revert because addr1 only has 100 tokens but tries to send 150
    await expect(
      airdrop.connect(addr1).transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});