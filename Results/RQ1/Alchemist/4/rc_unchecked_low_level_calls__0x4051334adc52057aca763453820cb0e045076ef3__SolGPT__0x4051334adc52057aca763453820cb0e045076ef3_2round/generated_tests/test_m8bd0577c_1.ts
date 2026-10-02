import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c test", function () {
  it("should revert when calling transfer with non-empty _tos array because mutant loop never executes", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    // Deploy the airdrop contract
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    const airdropAddress = await airdrop.getAddress();
    
    // Fund owner with tokens and approve airdrop to transferFrom
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(airdropAddress, ethers.parseEther("100"));
    
    // Record balances before
    const balanceBefore = await token.balanceOf(addr1.address);
    
    // Call transfer - the mutant loop will never execute due to i > _tos.length
    const tx = await airdrop.connect(owner).transfer(
      owner.address,
      tokenAddress,
      [addr1.address],
      ethers.parseEther("10")
    );
    await tx.wait();
    
    // Assert that no transfer happened - balance should remain unchanged
    const balanceAfter = await token.balanceOf(addr1.address);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});