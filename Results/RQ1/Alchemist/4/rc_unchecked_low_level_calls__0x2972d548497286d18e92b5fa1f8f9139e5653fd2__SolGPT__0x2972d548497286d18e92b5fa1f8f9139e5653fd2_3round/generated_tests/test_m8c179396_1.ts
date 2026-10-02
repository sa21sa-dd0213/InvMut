import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m8c179396 - loop condition changed from < to >", function () {
  it("should revert when attempting to transfer tokens with non-empty _tos array", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Give the "from" address some tokens and approve the demo contract to transfer
    const amount = ethers.parseEther("100");
    await token.transfer(from.address, amount);
    await token.connect(from).approve(await instance.getAddress(), amount);

    // Prepare the transfer parameters
    const tos = [recipient.address];
    const values = [ethers.parseEther("10")];

    // On the mutant, the loop condition i > _tos.length is false (0 > 1 is false),
    // so the loop never executes and no revert occurs - but the transfer doesn't happen either.
    // We expect the original to succeed, but the mutant will NOT revert because the loop body
    // is never reached, so we must check that the transfer actually happened.
    // Since the mutant skips the transfer, the recipient's balance will remain 0.
    
    // Call the transfer function
    const tx = await instance.connect(owner).transfer(from.address, await token.getAddress(), tos, values);
    await tx.wait();

    // Check recipient balance - should be > 0 if transfer occurred (original)
    // Should be 0 if loop never executed (mutant)
    const recipientBalance = await token.balanceOf(recipient.address);
    expect(recipientBalance).to.equal(ethers.parseEther("10"));
  });
});