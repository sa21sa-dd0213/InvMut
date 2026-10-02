import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c test", function () {
  it("should detect the mutant that changes i<_tos.length to i>_tos.length by verifying token transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token to test with
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Mint tokens to owner and approve airdrop contract to spend them
    const amount = ethers.parseEther("10");
    await token.mint(owner.address, amount);
    await token.connect(owner).approve(airdrop.target, amount);

    // Record balances before transfer
    const balanceBefore1 = await token.balanceOf(addr1.address);
    const balanceBefore2 = await token.balanceOf(addr2.address);

    // Call transfer function with two recipients
    const recipients = [addr1.address, addr2.address];
    const tx = await airdrop.connect(owner).transfer(
      owner.address,
      tokenAddress,
      recipients,
      ethers.parseEther("5")
    );
    await tx.wait();

    // Check balances after - mutant will not transfer anything, so balances should be unchanged
    const balanceAfter1 = await token.balanceOf(addr1.address);
    const balanceAfter2 = await token.balanceOf(addr2.address);

    // If mutant is live, balances remain same (i>_tos.length never executes loop)
    // If original, balances increase by 5 each
    expect(balanceAfter1).to.equal(balanceBefore1 + ethers.parseEther("5"));
    expect(balanceAfter2).to.equal(balanceBefore2 + ethers.parseEther("5"));
  });
});