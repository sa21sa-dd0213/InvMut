import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m61dcc4f5 - keccak256 replaced with sha256", function () {
  it("should fail to transfer tokens because sha256 produces wrong function selector", async function () {
    const [owner, recipient] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);

    // Approve airdrop contract to spend tokens (the airdrop contract itself)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    const approveAmount = ethers.parseEther("10");
    await token.approve(airdrop.target, approveAmount);

    // Transfer tokens from owner to recipient via airdrop contract
    const transferAmount = ethers.parseEther("5");
    const recipients = [recipient.address];

    // Call transfer on airdrop contract
    const tx = await airdrop.transfer(owner.address, token.target, recipients, transferAmount);
    await tx.wait();

    // Check recipient balance - should be 0 because sha256 selector is wrong
    const recipientBalance = await token.balanceOf(recipient.address);
    expect(recipientBalance).to.equal(0);

    // Check owner balance - should remain unchanged because transfer failed
    const ownerBalance = await token.balanceOf(owner.address);
    expect(ownerBalance).to.equal(mintAmount);
  });
});