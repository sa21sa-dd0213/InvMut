import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c test", function () {
  it("should kill mutant by verifying tokens are actually transferred to multiple recipients", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20"); // Assumes a basic ERC20 exists in contracts/
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Fund owner with tokens and approve airdrop to spend
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    const transferAmount = ethers.parseEther("10");
    await token.connect(owner).approve(airdrop.target, mintAmount);
    
    // Prepare recipients array with two addresses
    const recipients = [addr1.address, addr2.address];
    
    // Call transfer function on airdrop
    const tx = await airdrop.transfer(owner.address, token.target, recipients, transferAmount);
    await tx.wait();
    
    // Verify both recipients received the tokens (original should pass, mutant fails)
    expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
    expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
  });
});