import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m447c62cf test", function () {
  it("should revert when _tos array has elements due to out-of-bounds loop", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that has transferFrom for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund addr1 with tokens and approve owner to transfer
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(owner.address, ethers.parseEther("100"));
    
    // Deploy the airdrop contract (no constructor args)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Prepare recipients array with one address
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");
    
    // This should revert on mutant because loop goes to <= _tos.length
    // causing out-of-bounds access on the extra iteration
    await expect(
      airdrop.transfer(addr1.address, token.target, recipients, amount)
    ).to.be.reverted;
  });
});