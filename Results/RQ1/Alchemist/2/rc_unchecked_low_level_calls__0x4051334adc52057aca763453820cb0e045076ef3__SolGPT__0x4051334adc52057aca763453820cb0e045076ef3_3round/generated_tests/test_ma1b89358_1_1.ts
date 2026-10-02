import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant ma1b89358 test", function () {
  it("should revert when a transferFrom call fails, killing the mutant that removed the require(_s)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy the airdrop contract
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Setup: owner has tokens, gives allowance to airdrop contract for addr1 but NOT for addr2
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await airdrop.getAddress(), ethers.parseEther("50"));
    
    // Attempt to transfer from addr1 (has allowance) and addr2 (no allowance) - should fail on addr2
    const recipients = [addr2.address];
    await expect(
      airdrop.connect(owner).transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});