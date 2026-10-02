import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m8bd0577c by verifying loop iteration with non-empty _tos array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the airdrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that has transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("MockToken", "MTK", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve airdrop contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(instance.target, mintAmount);

    // Create recipients array with one address
    const recipients = [addr1.address];
    const transferAmount = ethers.parseEther("10");

    // Record balance before transfer
    const balanceBefore = await token.balanceOf(addr1.address);

    // Call transfer function - in original this should succeed
    const tx = await instance.transfer(owner.address, token.target, recipients, transferAmount);
    await tx.wait();

    // Check that transfer actually occurred (loop executed)
    const balanceAfter = await token.balanceOf(addr1.address);
    expect(balanceAfter).to.equal(balanceBefore + transferAmount);

    // If mutant is present, loop never executes and balance won't change
    // This assertion will fail on the mutant, killing it
  });
});